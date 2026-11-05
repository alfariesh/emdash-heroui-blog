/**
 * /api/v1/devices: the mobile app's way into the push-notifications plugin
 * (src/plugins/push-notifications). The endpoints check the request against
 * the API contract and a rate limit, then call the plugin's public routes
 * in-process, so device tokens stay in the plugin's own storage.
 */
import type { ApiDeviceRegistration, ApiDeviceStatus } from "@blog/shared";
import { isExpoPushToken } from "@blog/shared";
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { PUSH_PLUGIN_ID } from "../plugins/push-notifications";

/** A registration body is ~80 bytes; anything far larger is not one. */
const MAX_BODY_BYTES = 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Parses and validates a POST /api/v1/devices body; null when it is not a valid registration. */
export async function readRegistration(request: Request): Promise<ApiDeviceRegistration | null> {
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) return null;
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		return null;
	}
	if (!isRecord(body) || !isExpoPushToken(body.token)) return null;
	if (body.platform !== "ios" && body.platform !== "android") return null;
	return { token: body.token, platform: body.platform };
}

/**
 * True when this client is over the limit. Keyed by IP for want of anything
 * better on an anonymous endpoint; the limit is generous for that reason.
 * A deployment without the DEVICES_RATE_LIMIT binding is not limited.
 */
export async function isRateLimited(context: APIContext): Promise<boolean> {
	const limiter = (env as unknown as { DEVICES_RATE_LIMIT?: RateLimit }).DEVICES_RATE_LIMIT;
	if (!limiter) return false;
	const ip = context.request.headers.get("cf-connecting-ip") ?? "unknown";
	const { success } = await limiter.limit({ key: `devices:${ip}` });
	return !success;
}

/**
 * Calls a public route of the push plugin. Returns null when the plugin is
 * not enabled (the admin can switch plugins off), so the endpoint can 404.
 */
export async function callDeviceRoute(
	context: APIContext,
	route: "register" | "unregister",
	input: { token: string; platform?: string },
): Promise<ApiDeviceStatus | null> {
	const handler = context.locals.emdash?.handlePublicPluginApiRoute;
	if (!handler) throw new Error("EmDash runtime is not available");

	const request = new Request(new URL(`/_emdash/api/plugins/${PUSH_PLUGIN_ID}/${route}`, context.url), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const result = await handler(PUSH_PLUGIN_ID, "POST", route, request);
	if (result.success && isRecord(result.data) && typeof result.data.registered === "boolean") {
		return { registered: result.data.registered };
	}
	if (result.error?.code === "NOT_FOUND") return null;
	throw new Error(`push-notifications/${route} failed: ${result.error?.code ?? "unknown error"}`);
}
