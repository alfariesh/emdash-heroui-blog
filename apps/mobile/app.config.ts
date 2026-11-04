import type { ConfigContext, ExpoConfig } from "expo/config";
// Relative path, not "@blog/shared": the config loader runs this file outside
// Metro, and app-links.ts is the one shared file with no imports of its own.
import { APP_LINK_PATH_PREFIXES } from "../../packages/shared/src/app-links.ts";

/**
 * Expo app config.
 *
 * Deployment-specific values come from the environment so the repo stays
 * domain-neutral (see the root AGENTS.md). Set them in `apps/mobile/.env`
 * locally (copy `.env.example`) or as EAS environment variables:
 *
 *   EXPO_PUBLIC_API_URL  Origin of apps/web, e.g. https://blog.example.com.
 *                        Inlined into the JS bundle; read in src/lib/config.ts.
 *                        When it is https, its links open in the app (see below).
 *   APP_NAME             Name under the home-screen icon (default "Blog").
 *   APP_ID               iOS bundle identifier and Android package.
 *   APP_SCHEME           Deep-link scheme, e.g. blog://posts/slug.
 */
const APP_NAME = process.env.APP_NAME || "Blog";
const APP_ID = process.env.APP_ID || "com.example.blog";
const APP_SCHEME = process.env.APP_SCHEME || "blog";

/**
 * Verified links (iOS Universal Links, Android App Links): https URLs on the
 * blog's domain under APP_LINK_PATH_PREFIXES open the matching screen. Only
 * for an https origin, since Apple and Google verify nothing else. The domain
 * must serve the verification files from apps/web (APP_LINKS_* vars in its
 * wrangler.jsonc) with this build's IDs, or the links keep opening the browser.
 */
function appLinkHost(): string | null {
	try {
		const url = new URL(process.env.EXPO_PUBLIC_API_URL?.trim() ?? "");
		return url.protocol === "https:" && !url.port ? url.hostname : null;
	} catch {
		return null;
	}
}
const APP_LINK_HOST = appLinkHost();

/** Splash backgrounds: HeroUI `--background` in light (oklch 0.9702 0 0) and dark (oklch 12% …). */
const SPLASH_LIGHT = "#f5f5f5";
const SPLASH_DARK = "#060607";
/** HeroUI default accent, oklch(0.6204 0.195 253.83), as sRGB. */
const ACCENT = "#0485f7";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: APP_NAME,
	slug: "emdash-blog",
	version: "1.0.0",
	orientation: "portrait",
	scheme: APP_SCHEME,
	userInterfaceStyle: "automatic",
	icon: "./assets/images/icon.png",
	ios: {
		bundleIdentifier: APP_ID,
		supportsTablet: true,
		// EAS Build turns on the Associated Domains capability from this entitlement.
		...(APP_LINK_HOST ? { associatedDomains: [`applinks:${APP_LINK_HOST}`] } : {}),
	},
	android: {
		package: APP_ID,
		adaptiveIcon: {
			backgroundColor: ACCENT,
			foregroundImage: "./assets/images/android-icon-foreground.png",
			monochromeImage: "./assets/images/android-icon-monochrome.png",
		},
		...(APP_LINK_HOST
			? {
					intentFilters: [
						{
							action: "VIEW",
							autoVerify: true,
							category: ["BROWSABLE", "DEFAULT"],
							// "<prefix>..*": at least one character after the prefix, so /posts/ itself stays on the web.
							data: APP_LINK_PATH_PREFIXES.map((prefix) => ({
								scheme: "https",
								host: APP_LINK_HOST,
								pathPattern: `${prefix}..*`,
							})),
						},
					],
				}
			: {}),
	},
	web: {
		favicon: "./assets/images/favicon.png",
	},
	plugins: [
		"expo-router",
		"expo-font",
		"expo-sqlite",
		"expo-web-browser",
		[
			"expo-splash-screen",
			{
				image: "./assets/images/splash-icon.png",
				imageWidth: 88,
				backgroundColor: SPLASH_LIGHT,
				dark: { backgroundColor: SPLASH_DARK },
			},
		],
	],
	experiments: {
		typedRoutes: true,
		reactCompiler: true,
	},
});
