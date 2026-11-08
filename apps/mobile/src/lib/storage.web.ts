/**
 * Web preview stand-in for storage.ts: localStorage instead of SQLite, which
 * on the web needs a WASM build and cross-origin isolation headers.
 */
import type { KeyValueStorage } from "./storage";

function local(): Storage | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

export const storage: KeyValueStorage = {
	getItemSync: (key) => local()?.getItem(key) ?? null,
	setItemSync: (key, value) => local()?.setItem(key, value),
	getItem: async (key) => local()?.getItem(key) ?? null,
	setItem: async (key, value) => local()?.setItem(key, value),
	removeItem: async (key) => local()?.removeItem(key),
};
