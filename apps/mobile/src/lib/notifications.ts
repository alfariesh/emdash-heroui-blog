/**
 * "New posts" push notifications on the device: permission, the Expo push
 * token and its registration with the blog (POST /api/v1/devices). The
 * server (the push-notifications plugin in apps/web) sends one notification
 * per published post; tapping it opens the post (use-notification-navigation).
 *
 * Opt-in only: nothing asks for permission until the reader turns the switch
 * on in Settings. The choice is kept in `storage` behind a tiny external
 * store, like the theme and bookmarks.
 */
import { NEW_POSTS_CHANNEL_ID } from "@blog/shared";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { storage } from "./storage";

const STORAGE_KEY = "push";
/** The server only needs a refresh now and then; tokens rarely change. */
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

interface PushState {
	enabled: boolean;
	/**
	 * Token the server knows. Kept after switching off until the server has
	 * forgotten it too (an unregister can fail offline and is retried).
	 */
	token: string | null;
	/** ISO 8601 of the last successful registration. */
	registeredAt: string | null;
}

const DISABLED: PushState = { enabled: false, token: null, registeredAt: null };
const listeners = new Set<() => void>();

const projectId: string | undefined =
	(Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
	Constants.easConfig?.projectId;

function read(): PushState {
	try {
		const parsed: unknown = JSON.parse(storage.getItemSync(STORAGE_KEY) ?? "null");
		if (!parsed || typeof parsed !== "object") return DISABLED;
		const value = parsed as Partial<PushState>;
		return {
			enabled: value.enabled === true,
			token: typeof value.token === "string" ? value.token : null,
			registeredAt: typeof value.registeredAt === "string" ? value.registeredAt : null,
		};
	} catch {
		return DISABLED;
	}
}

// Read lazily: most launches never touch this store before Settings opens.
let state: PushState | null = null;

function getSnapshot(): PushState {
	state ??= read();
	return state;
}

function write(next: PushState): void {
	state = next;
	storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Whether the reader turned new-post notifications on. */
export function useNewPostNotifications(): boolean {
	return useSyncExternalStore(subscribe, () => getSnapshot().enabled);
}

export type PushUnavailableReason = "web" | "simulator" | "unconfigured";

/**
 * Why push cannot work in this build or on this device, or null when it can.
 * Simulators get no push token; a build without an EAS project ID cannot ask
 * Expo for one (see EAS_PROJECT_ID in app.config.ts).
 */
export function pushUnavailableReason(): PushUnavailableReason | null {
	if (Platform.OS === "web") return "web";
	if (!Device.isDevice) return "simulator";
	if (!projectId) return "unconfigured";
	return null;
}

const platform = (): "ios" | "android" => (Platform.OS === "ios" ? "ios" : "android");

async function expoPushToken(): Promise<string> {
	return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Android 13+ asks for permission only once a channel exists, so create it first. */
async function ensureChannel(): Promise<void> {
	if (Platform.OS !== "android") return;
	await Notifications.setNotificationChannelAsync(NEW_POSTS_CHANNEL_ID, {
		name: "New posts",
		description: "A note when a new post is published",
		importance: Notifications.AndroidImportance.DEFAULT,
	});
}

/**
 * Shows notifications that arrive while the app is open (the default is to
 * drop them). Called once at startup, before the first render.
 */
export function configureNotifications(): void {
	if (Platform.OS === "web") return;
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: false,
			shouldSetBadge: false,
		}),
	});
}

export type EnableResult = "enabled" | "denied" | "unavailable" | "failed";

/** Asks for permission, gets the push token and registers it with the blog. */
export async function enableNewPostNotifications(): Promise<EnableResult> {
	if (pushUnavailableReason()) return "unavailable";
	try {
		await ensureChannel();
		const current = await Notifications.getPermissionsAsync();
		const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
		if (!permission.granted) return "denied";

		const token = await expoPushToken();
		await api.registerDevice({ token, platform: platform() });
		write({ enabled: true, token, registeredAt: new Date().toISOString() });
		return "enabled";
	} catch {
		// No FCM config in the build, offline, or the server rejected it.
		return "failed";
	}
}

/** Turns notifications off here at once; the server is told now or on a later launch. */
export async function disableNewPostNotifications(): Promise<void> {
	const { token } = getSnapshot();
	write({ ...DISABLED, token });
	await forgetToken();
}

async function forgetToken(): Promise<void> {
	const { token } = getSnapshot();
	if (!token) return;
	try {
		await api.unregisterDevice(token);
		const latest = getSnapshot();
		if (!latest.enabled && latest.token === token) write(DISABLED);
	} catch {
		// Offline: keep the token so the next launch retries.
	}
}

/**
 * Startup housekeeping: finish a pending unregister, or refresh the
 * registration when the token changed or the server has not heard from this
 * device in a while. Never prompts; a permission revoked in the system
 * settings is left alone (Expo reports the token gone and the server drops it).
 */
export async function syncPushRegistration(): Promise<void> {
	const current = getSnapshot();
	if (!current.enabled) {
		await forgetToken();
		return;
	}
	if (pushUnavailableReason()) return;
	try {
		const permission = await Notifications.getPermissionsAsync();
		if (!permission.granted) return;
		const token = await expoPushToken();
		const age = current.registeredAt ? Date.now() - Date.parse(current.registeredAt) : Number.POSITIVE_INFINITY;
		if (token === current.token && age < REFRESH_MS) return;

		await api.registerDevice({ token, platform: platform() });
		if (current.token && current.token !== token) void api.unregisterDevice(current.token).catch(() => undefined);
		write({ enabled: true, token, registeredAt: new Date().toISOString() });
	} catch {
		// Offline or not configured: try again next launch.
	}
}
