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

function systemTheme(): ResolvedTheme {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Screen point the new theme grows out of (see `themeOrigin`). */
export interface ThemeOrigin {
	x: number;
	y: number;
}

/**
 * Where a theme change should start from: the centre of the control that was
 * pressed. Keyboard and assistive-tech presses get no origin, so the theme
 * switches instantly; a shortcut-speed action shouldn't wait on an animation.
 */
export function themeOrigin(press: {
	pointerType: string;
	target: Element;
}): ThemeOrigin | undefined {
	if (press.pointerType === "keyboard" || press.pointerType === "virtual") return undefined;
	const rect = press.target.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Applies a theme preference. With an `origin`, the new palette grows out of
 * that point in a circle (a same-document View Transition; styles in
 * global.css). Without one, or where View Transitions or motion are off, the
 * palette swaps at once.
 */
export function setThemePreference(preference: ThemePreference, origin?: ThemeOrigin) {
	const root = document.documentElement;
	const resolved = preference === "system" ? systemTheme() : preference;
	const changes = !root.classList.contains(resolved);

	const animate =
		origin &&
		changes &&
		typeof document.startViewTransition === "function" &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	if (!animate) {
		applyThemePreference(preference, resolved);
		return;
	}

	// Radius that reaches the farthest corner of the viewport
	const radius = Math.hypot(
		Math.max(origin.x, window.innerWidth - origin.x),
		Math.max(origin.y, window.innerHeight - origin.y),
	);
	root.style.setProperty("--theme-x", `${origin.x}px`);
	root.style.setProperty("--theme-y", `${origin.y}px`);
	root.style.setProperty("--theme-r", `${Math.ceil(radius)}px`);
	root.dataset.themeTransition = "";

	const transition = document.startViewTransition(() =>
		applyThemePreference(preference, resolved),
	);
	transition.finished.finally(() => {
		delete root.dataset.themeTransition;
		for (const name of ["--theme-x", "--theme-y", "--theme-r"]) root.style.removeProperty(name);
	});
}

function applyThemePreference(preference: ThemePreference, resolved: ResolvedTheme) {
	const root = document.documentElement;
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
