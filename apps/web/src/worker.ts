/**
 * Cloudflare Worker entry (wrangler.jsonc → "main").
 *
 * Wires Astro's request handler and the Cron Trigger: the `scheduled`
 * handler publishes scheduled posts and runs EmDash maintenance. Without it
 * (or without `triggers.crons` in wrangler.jsonc) scheduled posts never go
 * live in production. `PluginBridge` is only used by sandboxed plugins and is
 * harmless otherwise.
 */
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

export default {
	...handler,
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
