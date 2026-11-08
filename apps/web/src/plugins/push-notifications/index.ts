/**
 * "Tulisan baru" push notifications: a native EmDash plugin registered in
 * astro.config.mjs (native because this site runs no sandbox runner).
 *
 * - Devices: the app sends its Expo push token to /api/v1/devices, which
 *   forwards to the public `register` / `unregister` routes here. Tokens
 *   live in the plugin's own storage collection; nothing here touches the
 *   EmDash database directly.
 * - Sending: `content:afterPublish` runs after every publish of a post, by
 *   hand or on schedule. Each post notifies once (a KV claim), so publishing
 *   an edit or re-publishing after an unpublish stays quiet.
 * - Settings (admin → Plugins): an on/off switch and an optional Expo access
 *   token, for projects with Expo's "enhanced push security" turned on.
 */
import { isExpoPushToken, NEW_POSTS_CHANNEL_ID, type NewPostNotificationData } from "@blog/shared";
import { definePlugin, PluginRouteError, type PluginContext } from "emdash";
import { EXPO_BATCH_SIZE, sendBatch, truncate, type PushContent } from "./expo";

export const PUSH_PLUGIN_ID = "push-notifications";
export const PUSH_PLUGIN_VERSION = "1.0.0";

const TITLE_MAX = 80;
const BODY_MAX = 160;

interface DeviceRecord {
	platform: "ios" | "android";
	/** ISO 8601; refreshed whenever the app re-registers. */
	updatedAt: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

function readToken(input: unknown): string {
	const token = isRecord(input) ? input.token : undefined;
	if (!isExpoPushToken(token)) throw PluginRouteError.badRequest("Invalid Expo push token");
	return token;
}

function readPlatform(input: unknown): DeviceRecord["platform"] {
	const platform = isRecord(input) ? input.platform : undefined;
	if (platform !== "ios" && platform !== "android") throw PluginRouteError.badRequest("Invalid platform");
	return platform;
}

/** The fields a notification needs from the published entry (`content.data` holds the collection fields). */
function readPost(content: Record<string, unknown>) {
	const data = isRecord(content.data) ? content.data : {};
	const id = str(content.id);
	const slug = str(content.slug) ?? str(data.slug);
	const title = str(data.title);
	if (!id || !slug || !title) return null;
	return { id, slug, title, excerpt: str(data.excerpt) };
}

/** Every registered token, one storage page (= one Expo batch) at a time. */
async function* deviceBatches(ctx: PluginContext): AsyncGenerator<string[]> {
	let cursor: string | undefined;
	do {
		const page = await ctx.storage.devices.query({ limit: EXPO_BATCH_SIZE, cursor });
		const tokens = page.items.map((item) => item.id).filter(isExpoPushToken);
		if (tokens.length > 0) yield tokens;
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);
}

async function notifyNewPost(ctx: PluginContext, post: NonNullable<ReturnType<typeof readPost>>) {
	const http = ctx.http;
	if (!http) return;

	const data: NewPostNotificationData = { url: ctx.url(`/posts/${encodeURIComponent(post.slug)}`) };
	const content: PushContent = {
		title: truncate(post.title, TITLE_MAX),
		body: truncate(post.excerpt ?? `Tulisan baru di ${ctx.site.name || "blog"}.`, BODY_MAX),
		data: { ...data },
		channelId: NEW_POSTS_CHANNEL_ID,
	};
	const accessToken = await ctx.settings.get<string>("expoAccessToken");

	const totals = { ok: 0, failed: 0, removed: 0, requestFailures: 0 };
	for await (const tokens of deviceBatches(ctx)) {
		const result = await sendBatch((url, init) => http.fetch(url, init), tokens, content, accessToken);
		totals.ok += result.ok;
		totals.failed += result.failed;
		if (result.requestFailed) totals.requestFailures++;
		if (result.unregistered.length > 0) {
			totals.removed += await ctx.storage.devices.deleteMany(result.unregistered);
		}
	}
	return { url: data.url, ...totals };
}

/** Runtime factory: EmDash imports `createPlugin` by name from the descriptor's entrypoint. */
export function createPlugin() {
	return definePlugin({
		id: PUSH_PLUGIN_ID,
		version: PUSH_PLUGIN_VERSION,
		capabilities: ["content:read", "network:request"],
		allowedHosts: ["exp.host"],
		storage: {
			devices: { indexes: ["updatedAt"] },
		},
		admin: {
			settingsSchema: {
				enabled: {
					type: "boolean",
					label: "Kirim notifikasi tulisan baru",
					description: "Setiap tulisan yang terbit dikirim sekali ke aplikasi mobile yang mengaktifkan notifikasi.",
					default: true,
				},
				expoAccessToken: {
					type: "secret",
					label: "Expo access token",
					description: "Hanya perlu bila \"Enhanced push security\" aktif di proyek Expo.",
				},
			},
		},
		routes: {
			register: {
				public: true,
				methods: ["POST"],
				request: { body: "json", maxBytes: 1024 },
				handler: async (ctx) => {
					const token = readToken(ctx.input);
					const device: DeviceRecord = { platform: readPlatform(ctx.input), updatedAt: new Date().toISOString() };
					await ctx.storage.devices.put(token, device);
					return { registered: true };
				},
			},
			unregister: {
				public: true,
				methods: ["POST"],
				request: { body: "json", maxBytes: 1024 },
				handler: async (ctx) => {
					await ctx.storage.devices.delete(readToken(ctx.input));
					return { registered: false };
				},
			},
		},
		hooks: {
			"content:afterPublish": async (event, ctx) => {
				if (event.collection !== "posts") return;
				if ((await ctx.settings.get<boolean>("enabled")) === false) return;
				const post = readPost(event.content);
				if (!post) return;

				const claimKey = `notified:${post.id}`;
				const claim = await ctx.kv.compareAndSet(claimKey, null, new Date().toISOString());
				if (!claim.applied) return;

				const totals = await notifyNewPost(ctx, post);
				if (!totals) return;
				// Nothing reached Expo (network or service down): release the claim so a later publish retries.
				if (totals.ok === 0 && totals.requestFailures > 0) await ctx.kv.delete(claimKey);
				ctx.log.info("New-post notification", totals);
			},
		},
	});
}
