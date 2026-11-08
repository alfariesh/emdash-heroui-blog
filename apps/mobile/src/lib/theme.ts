/**
 * Light / dark / system theme preference.
 *
 * Uniwind owns the active theme (HeroUI Native tokens follow it); this module
 * only remembers the visitor's choice. `applyStoredTheme()` runs once at
 * startup, before the first render, so the app never flashes the wrong theme.
 */
import { useSyncExternalStore } from "react";
import { Uniwind } from "uniwind";
import { storage } from "./storage";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function isThemePreference(value: unknown): value is ThemePreference {
	return value === "system" || value === "light" || value === "dark";
}

let current: ThemePreference = "system";

export function applyStoredTheme(): void {
	const stored = storage.getItemSync(STORAGE_KEY);
	current = isThemePreference(stored) ? stored : "system";
	Uniwind.setTheme(current);
}

export function setThemePreference(preference: ThemePreference): void {
	if (preference === current) return;
	current = preference;
	Uniwind.setTheme(preference);
	storage.setItemSync(STORAGE_KEY, preference);
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** The stored preference ("system" included); use `useUniwind().theme` for the resolved theme. */
export function useThemePreference(): ThemePreference {
	return useSyncExternalStore(subscribe, () => current);
}
