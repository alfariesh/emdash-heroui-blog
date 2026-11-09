/**
 * Links from content (menu items, Portable Text, site URLs) open in the app
 * when they point at a screen the app has, and in the in-app browser
 * otherwise. Every URL from the API is absolute (see ApiSite / Portable Text).
 */
import type { Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { API_URL } from "./config";

/**
 * Web paths the app can show natively, mirroring apps/web/src/pages. The
 * slug routes match APP_LINK_PATH_PREFIXES (@blog/shared), the paths that
 * open the app from outside; keep the two in step.
 */
const ROUTES: ReadonlyArray<[RegExp, (slug: string) => Href]> = [
	[/^\/posts\/([^/]+)\/?$/, (slug) => ({ pathname: "/posts/[slug]", params: { slug } })],
	[/^\/pages\/([^/]+)\/?$/, (slug) => ({ pathname: "/pages/[slug]", params: { slug } })],
	[/^\/category\/([^/]+)\/?$/, (slug) => ({ pathname: "/category/[slug]", params: { slug } })],
	[/^\/tag\/([^/]+)\/?$/, (slug) => ({ pathname: "/tag/[slug]", params: { slug } })],
];

function sameOrigin(url: URL): boolean {
	if (!API_URL) return false;
	try {
		return url.origin === new URL(API_URL).origin;
	} catch {
		return false;
	}
}

/** The in-app route for a blog URL, or null when the app has no screen for it. */
export function toAppHref(rawUrl: string): Href | null {
	let url: URL;
	try {
		url = new URL(rawUrl, API_URL ?? undefined);
	} catch {
		return null;
	}
	if (!sameOrigin(url)) return null;

	const path = url.pathname;
	if (path === "/" || path === "" || path === "/posts" || path === "/posts/") return "/";
	if (path === "/search" || path === "/search/") return "/search";
	for (const [pattern, build] of ROUTES) {
		const slug = pattern.exec(path)?.[1];
		if (!slug) continue;
		try {
			return build(decodeURIComponent(slug));
		} catch {
			return null; // a malformed escape such as %E0%A4%A: not an app route
		}
	}
	return null;
}

/** Public web URL of a post, for sharing. */
export function postWebUrl(slug: string): string {
	return `${API_URL ?? ""}/posts/${encodeURIComponent(slug)}`;
}

/** Opens a non-app URL: http(s) in the in-app browser, mailto:/tel: in the system handler. */
export async function openExternal(url: string): Promise<void> {
	if (/^https?:\/\//i.test(url)) {
		await WebBrowser.openBrowserAsync(url, {
			presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
		});
		return;
	}
	if (await Linking.canOpenURL(url)) await Linking.openURL(url);
}
