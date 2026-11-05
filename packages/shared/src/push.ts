/**
 * Push notifications for new posts: what both apps must agree on.
 * apps/web sends through the Expo push service when a post is published;
 * apps/mobile registers its Expo push token and opens `data.url` on tap.
 */

/** Android notification channel for new posts: the app creates it, the server names it. */
export const NEW_POSTS_CHANNEL_ID = "new-posts";

/** `data` of a new-post notification. */
export interface NewPostNotificationData {
	/** Public URL of the post. The app routes it like any blog link. */
	url: string;
}

// "ExponentPushToken[…]" (current) or "ExpoPushToken[…]" (older SDKs).
const EXPO_PUSH_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

/** True for a well-formed Expo push token; anything else is rejected before storage. */
export function isExpoPushToken(value: unknown): value is string {
	return typeof value === "string" && EXPO_PUSH_TOKEN.test(value);
}
