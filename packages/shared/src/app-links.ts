/**
 * Web paths that open in the mobile app instead of the browser, through
 * verified links (iOS Universal Links, Android App Links).
 *
 * Each entry is a path prefix followed by a slug, and the app has a screen at
 * the same path (apps/mobile/src/app/<prefix>[slug].tsx), so Expo Router
 * resolves an incoming https URL without any mapping. apps/web lists these
 * paths in /.well-known/apple-app-site-association; apps/mobile/app.config.ts
 * registers them as Android intent filters.
 *
 * This file has no imports so app.config.ts can load it directly.
 */
export const APP_LINK_PATH_PREFIXES = ["/posts/", "/pages/", "/category/", "/tag/"] as const;
