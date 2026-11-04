import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Public origin, e.g. https://blog.example.com. Set EMDASH_SITE_URL where
// the site is built AND where it runs; EmDash reads the same variable for
// passkeys, CSRF and email links. Leave it unset for local dev so passkeys
// stay bound to localhost and the API follows the request origin
// (LAN / Android emulator testing). See src/lib/site-url.ts.
const siteUrl = process.env.EMDASH_SITE_URL || process.env.SITE_URL || undefined;

export default defineConfig({
	site: siteUrl,
	output: "server",
	adapter: node({
		mode: "standalone",
	}),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
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
