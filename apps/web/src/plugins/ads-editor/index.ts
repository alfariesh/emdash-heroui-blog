import { definePlugin } from "emdash";

/** Trusted admin components only; no plugin routes, storage, or outbound requests. */
export function createPlugin() {
	return definePlugin({
		id: "ads-editor",
		version: "1.1.0",
		admin: { entry: "/src/plugins/ads-editor/admin.tsx" },
	});
}
