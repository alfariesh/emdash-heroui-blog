/**
 * Pure state for "Continue reading": where the reader left each article.
 * Storage lives in reading-progress.ts; this file has no imports so the
 * rules are unit-tested with Node.
 */

/** Where a reader left an article. */
export interface ReadingPosition {
	/** Scroll offset of the article screen, in px on this device. */
	offset: number;
	/** Share of the article body read, 0–1. */
	progress: number;
	/** ISO 8601. */
	savedAt: string;
}

export type ReadingPositions = Record<string, ReadingPosition>;

/** Below this the reader barely started: nothing worth offering. */
export const MIN_RESUME_PROGRESS = 0.05;
/** From here on the body is read to the end: the article is done. */
export const DONE_PROGRESS = 0.95;
/** Most recent articles kept, so the store cannot grow forever. */
export const MAX_POSITIONS = 50;

const isPosition = (value: unknown): value is ReadingPosition => {
	if (!value || typeof value !== "object") return false;
	const { offset, progress, savedAt } = value as Record<string, unknown>;
	return (
		typeof offset === "number" &&
		Number.isFinite(offset) &&
		offset >= 0 &&
		typeof progress === "number" &&
		progress >= MIN_RESUME_PROGRESS &&
		progress < DONE_PROGRESS &&
		typeof savedAt === "string"
	);
};

/** Parses the stored JSON, keeping only well-formed, resumable entries. */
export function parsePositions(raw: string | null): ReadingPositions {
	if (!raw) return {};
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
	return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isPosition(value))) as ReadingPositions;
}

/**
 * Records where the reader left `slug`. A position near the top (scrolled
 * back up: they will start over) or past the end of the body (finished)
 * removes the entry instead, so only real "half-read" articles are offered.
 */
export function recordPosition(
	positions: ReadingPositions,
	slug: string,
	offset: number,
	progress: number,
	now: Date,
): ReadingPositions {
	const rest = Object.fromEntries(Object.entries(positions).filter(([key]) => key !== slug));
	const position = { offset: Math.round(offset), progress, savedAt: now.toISOString() };
	if (!isPosition(position)) return rest;

	const entries = Object.entries({ ...rest, [slug]: position });
	if (entries.length <= MAX_POSITIONS) return Object.fromEntries(entries);
	// ISO 8601 strings sort chronologically.
	entries.sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt));
	return Object.fromEntries(entries.slice(0, MAX_POSITIONS));
}
