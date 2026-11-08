import Constants from "expo-constants";

/** Port of `pnpm dev` in apps/web (Astro's default). */
const DEV_WEB_PORT = 4321;

/**
 * Origin of apps/web, whose public `/api/v1` the app reads.
 *
 * 1. `EXPO_PUBLIC_API_URL` (apps/mobile/.env or EAS env), inlined at build time.
 *    Expo only inlines the literal `process.env.EXPO_PUBLIC_*` expression,
 *    so do not read it dynamically.
 * 2. In development only: the machine running Metro, on the web dev port.
 *    That is the LAN IP for a phone and `10.0.2.2`-style hosts for emulators,
 *    so `pnpm dev --host` + `pnpm --filter @blog/mobile start` needs no setup.
 */
function resolveApiUrl(): string | null {
	const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
	if (fromEnv) return fromEnv.replace(/\/+$/, "");

	if (__DEV__) {
		const host = Constants.expoConfig?.hostUri?.split(":")[0];
		if (host) return `http://${host}:${DEV_WEB_PORT}`;
	}
	return null;
}

export const API_URL = resolveApiUrl();
