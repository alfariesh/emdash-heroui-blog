/**
 * Small key-value store on SQLite (expo-sqlite/kv-store).
 *
 * The sync API lets startup code (the theme preference) read before the
 * first render, so there is no flash of the wrong theme. The async API is
 * AsyncStorage-compatible and backs the TanStack Query persister.
 * `storage.web.ts` swaps in localStorage for the web preview.
 */
import KVStore from "expo-sqlite/kv-store";

export interface KeyValueStorage {
	getItemSync(key: string): string | null;
	setItemSync(key: string, value: string): void;
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
}

export const storage: KeyValueStorage = KVStore;
