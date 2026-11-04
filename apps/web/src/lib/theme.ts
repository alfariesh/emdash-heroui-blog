/**
 * Colour theme helpers shared by the React islands.
 *
 * HeroUI switches palettes with a `light` / `dark` class on <html>. The
 * visitor's explicit choice lives in a `theme` cookie so the server can render
 * the right class on the first byte; with no cookie the site follows the OS
 * (resolved by the inline script in Base.astro before first paint).
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_EVENT = "site:themechange";

const COOKIE_NAME = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function isThemePreference(value: unknown): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

export function getResolvedTheme(): ResolvedTheme {
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function systemTheme(): ResolvedTheme {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference) {
	const root = document.documentElement;
	const resolved = preference === "system" ? systemTheme() : preference;

	root.classList.remove("light", "dark");
	root.classList.add(resolved);
	root.dataset.themePreference = preference;

	const secure = location.protocol === "https:" ? "; Secure" : "";
	document.cookie =
		preference === "system"
			? `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secure}`
			: `${COOKIE_NAME}=${preference}; path=/; max-age=${ONE_YEAR}; SameSite=Lax${secure}`;

	window.dispatchEvent(
		new CustomEvent(THEME_EVENT, { detail: { preference, resolved } }),
	);
}
