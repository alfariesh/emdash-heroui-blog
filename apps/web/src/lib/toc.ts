/**
 * Maths behind the article table of contents (`components/TableOfContents.astro`):
 * a ruler of ticks that swells around the part of the article being read, with
 * the entries' text darkening in step. Pure (no DOM), so the component script
 * and the tests share it.
 */

/** Height of one line of TOC text (14px type), in px. The ruler is built on this grid. */
export const TOC_LINE = 20;
/** Distance between two ticks (centre to centre), in px. One text line spans four. */
export const TICK_PITCH = 5;

/** Readable `id` for a heading: lower case, accents dropped, words joined by "-". */
export function slugifyHeading(text: string): string {
	return text
		.normalize("NFKD")
		.replace(/\p{M}+/gu, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.slice(0, 80)
		.replace(/^-+|-+$/g, "");
}

/** `base`, or `base-2`, `base-3`… when the page already uses it. */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) {
		const id = `${base}-${n}`;
		if (!taken.has(id)) return id;
	}
}

/**
 * Entry being read: the last one whose top is at or above `line`, or -1 before
 * the first. `tops` and `line` share one coordinate space; `tops` ascends.
 */
export function activeIndex(tops: readonly number[], line: number): number {
	let found = -1;
	for (let i = 0; i < tops.length; i++) {
		if (tops[i]! > line) break;
		found = i;
	}
	return found;
}

/**
 * Where the reader is on the list, in px, as a continuous value: it sits on an
 * entry's `anchor` while that section starts at `line`, then drifts towards the
 * next entry's anchor as the section is read. Before the first section it rests
 * on the first entry; in the last section, on the last.
 */
export function readingPosition(
	tops: readonly number[],
	anchors: readonly number[],
	line: number,
): number {
	const first = anchors[0];
	if (first === undefined) return 0;

	const i = activeIndex(tops, line);
	if (i < 0) return first;

	const here = anchors[i]!;
	const next = anchors[i + 1];
	if (next === undefined) return here;

	const span = tops[i + 1]! - tops[i]!;
	if (span <= 0) return here;
	const progress = Math.min(Math.max((line - tops[i]!) / span, 0), 1);
	return here + (next - here) * progress;
}

/** How many ticks fit a list `height` px tall: from the first line's centre to the last line's. */
export function tickCount(height: number): number {
	if (height < TOC_LINE) return 0;
	return Math.floor((height - TOC_LINE) / TICK_PITCH) + 1;
}

/** Centre of tick `index`, in px from the top of the list. */
export function tickCenter(index: number): number {
	return TOC_LINE / 2 + index * TICK_PITCH;
}

/**
 * Strength (0 to 1) of a tick `distance` px from the cursor: a sharp peak with
 * a tail of a few ticks, like a magnifier passing over a ruler.
 */
export function tickWeight(distance: number, spread = 10): number {
	const u = (distance / spread) ** 2;
	return 1 / (1 + u) ** 2;
}

/**
 * Emphasis (0 to 1) of an entry's text `distance` px from a cursor. Wider than
 * a tick, so a hover swell sitting between two entries shares itself over both.
 */
export function labelWeight(distance: number, spread = 24): number {
	return Math.exp(-((distance / spread) ** 2));
}

/**
 * One frame of exponential smoothing: closes the gap to `target` by the same
 * share per millisecond whatever the frame rate. `tau` is the time constant in ms.
 */
export function ease(current: number, target: number, dt: number, tau: number): number {
	return target + (current - target) * Math.exp(-dt / tau);
}
