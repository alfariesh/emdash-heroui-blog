/**
 * Small helpers for the site's motion (styles live in src/styles/global.css,
 * "Motion" section).
 */

/**
 * Inline `--enter-delay` for the page-entrance choreography (`data-enter`).
 * With an index, items of a group start on a wave: the gaps shrink as the
 * group goes on, and items past `cap` arrive with the last one, so a long
 * row never makes the visitor wait.
 */
export function enterDelay(
	start: number,
	index = 0,
	{ step = 45, cap = 6 }: { step?: number; cap?: number } = {},
): string {
	const ms = Math.round(start + Math.sqrt(Math.min(index, cap)) * step);
	return `--enter-delay: ${ms}ms`;
}
