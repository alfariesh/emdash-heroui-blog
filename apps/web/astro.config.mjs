import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import { readFileSync } from "node:fs";

/** `vars.EMDASH_SITE_URL` from wrangler.jsonc (JSONC: comments, trailing commas). */
function siteUrlFromWrangler() {
	try {
		const jsonc = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
		const json = jsonc
			// Drop // and /* */ comments, but keep strings intact (URLs contain //)
			.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, str) => str ?? "")
			.replace(/,(\s*[}\]])/g, "$1");
		return JSON.parse(json)?.vars?.EMDASH_SITE_URL || undefined;
	} catch {
		return undefined;
	}
}

// Public origin (EMDASH_SITE_URL). wrangler.jsonc `vars` is the single source:
// - at runtime EmDash reads it there (passkeys, CSRF, email links);
// - for `astro build` we also need it in process.env, because EmDash bakes
//   the image-optimisation allow-list (image.remotePatterns) at build time and
//   Astro `site` drives canonical/OG/RSS and /api/v1 URLs (src/lib/site-url.ts).
// `astro dev` leaves it unset so passkeys stay on localhost and LAN /
// Android-emulator testing works. An explicit env var always wins.
if (process.argv.includes("build") && !process.env.EMDASH_SITE_URL && !process.env.SITE_URL) {
	const fromWrangler = siteUrlFromWrangler();
	if (fromWrangler) process.env.EMDASH_SITE_URL = fromWrangler;
}
const siteUrl = process.env.EMDASH_SITE_URL || process.env.SITE_URL || undefined;

// "Tulisan baru" push notifications for the mobile app: a native EmDash plugin
// that lives in this repo (src/plugins/push-notifications). The entrypoint is a
// Vite root-relative path; id and version must match its createPlugin().
const pushNotificationsPlugin = {
	id: "push-notifications",
	version: "1.0.0",
	format: "native",
	entrypoint: "/src/plugins/push-notifications/index.ts",
};

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
			plugins: [pushNotificationsPlugin],
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
