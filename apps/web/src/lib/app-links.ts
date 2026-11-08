/**
 * Verification files that let blog links open in the mobile app instead of
 * the browser: iOS Universal Links (/.well-known/apple-app-site-association)
 * and Android App Links (/.well-known/assetlinks.json).
 *
 * The app identities are deployment-specific, so they come from Worker
 * variables (wrangler.jsonc `vars`, or `.env` locally):
 *
 *   APP_LINKS_IOS_APP_IDS      "<Team ID>.<bundle id>", e.g. ABCDE12345.com.example.blog.
 *                              Several comma-separated, e.g. a preview and a production build.
 *   APP_LINKS_ANDROID_PACKAGE  Android package (the app's APP_ID), e.g. com.example.blog.
 *   APP_LINKS_ANDROID_SHA256   SHA-256 fingerprints of the signing certificates, comma-separated
 *                              (Play App Signing key, plus the upload/EAS key for sideloaded builds).
 *   APP_LINKS_IOS_STORE_ID     Numeric App Store ID (App Store Connect → App Information → Apple ID):
 *                              turns on Safari's Smart App Banner on every page (Base.astro).
 *
 * An empty value turns the matching file off (404), so a fork without an app
 * serves nothing. The paths come from APP_LINK_PATH_PREFIXES in @blog/shared,
 * the same list the app registers.
 */
import { APP_LINK_PATH_PREFIXES } from "@blog/shared";
import { env } from "cloudflare:workers";

const IOS_APP_ID = /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/;
const APP_STORE_ID = /^\d+$/;
const ANDROID_PACKAGE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;
const SHA256_HEX = /^[0-9A-F]{64}$/;
const LIST_SEPARATOR = /[\s,]+/;
const NOT_HEX = /[^0-9A-Fa-f]/g;
const BYTE_PAIRS = /.{2}/g;

/**
 * `wrangler types` types each var as its literal in wrangler.jsonc (empty in
 * the repo), and a fork may drop them, so read the value as an unknown string.
 */
function variable(name: string): string {
	const value = (env as unknown as Record<string, unknown>)[name];
	return typeof value === "string" ? value.trim() : "";
}

function list(value: string): string[] {
	return value.split(LIST_SEPARATOR).filter(Boolean);
}

/** Accepts "AB:CD:…" (as Play Console and EAS print it) or bare hex; returns the colon form. */
function normalizeFingerprint(value: string): string | null {
	const hex = value.replace(NOT_HEX, "").toUpperCase();
	if (!SHA256_HEX.test(hex)) return null;
	return hex.match(BYTE_PAIRS)?.join(":") ?? null;
}

/** Valid entries only; a typo is logged instead of being published in a file Apple/Google cache. */
function valid<T>(name: string, values: string[], parse: (value: string) => T | null): T[] {
	const parsed: T[] = [];
	for (const value of values) {
		const result = parse(value);
		if (result === null) console.warn(`[app-links] ${name}: ignoring invalid value "${value}"`);
		else parsed.push(result);
	}
	return parsed;
}

/** apple-app-site-association for the configured app IDs, or null when there are none. */
export function appleAppSiteAssociation(): object | null {
	const appIDs = valid("APP_LINKS_IOS_APP_IDS", list(variable("APP_LINKS_IOS_APP_IDS")), (id) =>
		IOS_APP_ID.test(id) ? id : null,
	);
	if (appIDs.length === 0) return null;
	return {
		applinks: {
			details: [
				{
					appIDs,
					// "?*" needs at least one character, so /posts/ itself stays on the web.
					components: APP_LINK_PATH_PREFIXES.map((prefix) => ({ "/": `${prefix}?*` })),
				},
			],
		},
	};
}

/** Digital Asset Links statement for the configured Android app, or null when it is not set. */
export function assetLinks(): object[] | null {
	const packageName = variable("APP_LINKS_ANDROID_PACKAGE");
	const fingerprints = valid(
		"APP_LINKS_ANDROID_SHA256",
		list(variable("APP_LINKS_ANDROID_SHA256")),
		normalizeFingerprint,
	);
	if (!packageName || fingerprints.length === 0) return null;
	if (!ANDROID_PACKAGE.test(packageName)) {
		console.warn(`[app-links] APP_LINKS_ANDROID_PACKAGE: ignoring invalid value "${packageName}"`);
		return null;
	}
	return [
		{
			relation: ["delegate_permission/common.handle_all_urls"],
			target: {
				namespace: "android_app",
				package_name: packageName,
				sha256_cert_fingerprints: fingerprints,
			},
		},
	];
}

/**
 * Content of the `apple-itunes-app` meta tag (Safari's Smart App Banner), or
 * null when APP_LINKS_IOS_STORE_ID is unset. `app-argument` is the page's
 * public URL: the app routes it like a verified link, so "Buka" lands on the
 * same post. Pass the URL without its query, so preview tokens never leak.
 */
export function smartAppBanner(pageUrl: string): string | null {
	const storeId = variable("APP_LINKS_IOS_STORE_ID");
	if (!storeId) return null;
	if (!APP_STORE_ID.test(storeId)) {
		console.warn(`[app-links] APP_LINKS_IOS_STORE_ID: ignoring invalid value "${storeId}"`);
		return null;
	}
	return `app-id=${storeId}, app-argument=${pageUrl}`;
}

/**
 * The file as JSON. Apple and Google require HTTP 200, `application/json` and
 * no redirect; both cache what they fetch, so an hour here costs nothing.
 */
export function verificationResponse(body: object | null): Response {
	if (!body) {
		return new Response("Not found", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
		});
	}
	return new Response(JSON.stringify(body, null, 2), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
