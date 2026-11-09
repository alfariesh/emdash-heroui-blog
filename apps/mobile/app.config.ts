import type { ConfigContext, ExpoConfig } from "expo/config";
// Relative paths, not "@blog/shared": the config loader runs this file outside
// Metro, so it can only load shared files that have no imports of their own.
import { APP_LINK_PATH_PREFIXES } from "../../packages/shared/src/app-links.ts";
import { NEW_POSTS_CHANNEL_ID } from "../../packages/shared/src/push.ts";

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
 *   EAS_PROJECT_ID       EAS project (`eas init` prints it). Push notifications need it to
 *                        get an Expo push token; without it the switch in Settings is off.
 *   GOOGLE_SERVICES_JSON Path to google-services.json (an EAS "file" variable): Firebase
 *                        Cloud Messaging, which Android push goes through.
 */
const APP_NAME = process.env.APP_NAME || "Blog";
const APP_ID = process.env.APP_ID || "com.example.blog";
const APP_SCHEME = process.env.APP_SCHEME || "blog";
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID?.trim() || undefined;
const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON?.trim() || undefined;

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

/** Splash backgrounds: the theme's `--background` (warm-taupe in light, near-black in dark), see src/global.css. */
const SPLASH_LIGHT = "#f5f3f1";
const SPLASH_DARK = "#0c0b0a";
/** Logo red: the adaptive-icon background and the notification tint. */
const BRAND = "#F14422";

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
		...(GOOGLE_SERVICES_JSON ? { googleServicesFile: GOOGLE_SERVICES_JSON } : {}),
		adaptiveIcon: {
			backgroundColor: BRAND,
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
			"expo-notifications",
			{
				// Android draws the small icon as a white silhouette: the monochrome launcher layer fits.
				icon: "./assets/images/android-icon-monochrome.png",
				color: BRAND,
				defaultChannel: NEW_POSTS_CHANNEL_ID,
			},
		],
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
	...(EAS_PROJECT_ID ? { extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } } } : {}),
	experiments: {
		typedRoutes: true,
		reactCompiler: true,
	},
});
