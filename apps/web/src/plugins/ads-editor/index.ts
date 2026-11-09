import { definePlugin } from "emdash";

/** Trusted admin components only; no routes, storage, or network access. */
export function createPlugin() {
	return definePlugin({
		id: "ads-editor",
		version: "1.0.0",
		admin: { entry: "/src/plugins/ads-editor/admin.tsx" },
	});
}
