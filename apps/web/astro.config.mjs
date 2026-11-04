import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

// Optional canonical origin for URLs built at render time (canonical/OG, RSS,
// /api/v1). On Cloudflare the request URL is already the public one, so this
// is only needed to force a single host. EmDash itself reads EMDASH_SITE_URL
// at runtime from `vars` in wrangler.jsonc (passkeys, CSRF, email links).
// Keep it unset for local dev so passkeys stay on localhost and LAN /
// Android-emulator testing works. See src/lib/site-url.ts.
const siteUrl = process.env.EMDASH_SITE_URL || process.env.SITE_URL || undefined;

export default defineConfig({
	site: siteUrl,
	output: "server",
	// Cloudflare Workers; D1 (database) and R2 (media) bindings are declared in wrangler.jsonc.
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	vite: {
		// Tailwind CSS v4 powers HeroUI v3 styles (see src/styles/global.css).
		plugins: [tailwindcss()],
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-body",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			// Not --font-mono: Tailwind owns that name (see src/styles/global.css)
			cssVariable: "--font-code",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
