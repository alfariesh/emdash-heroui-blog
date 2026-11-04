/**
 * The public origin used for absolute URLs (SEO canonical/OG, RSS, and every
 * URL in the /api/v1 JSON).
 *
 * Production sets Astro's `site` from EMDASH_SITE_URL (see astro.config.mjs),
 * so URLs always point at the real domain, even behind a proxy and regardless
 * of the request's Host header. In local dev `site` is unset and the request
 * origin is used, so localhost, LAN IPs and the Android emulator (10.0.2.2)
 * keep working.
 */
export function publicOrigin(context: { site?: URL; url: URL }): string {
	return context.site?.origin ?? context.url.origin;
}
