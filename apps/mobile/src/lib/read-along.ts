/**
 * Pure rules for "Listen to this article": where the playhead is in the
 * narration, how a block's rendered spans split into the narration's words,
 * and the player's small formatting helpers. No React, no native modules, so
 * Node's test runner can load it (read-along.test.ts).
 */
import type { ApiAudioBlock } from "@blog/shared";

/** The narrated block (index into `blocks`) and word (-1 between words) at a time. */
export interface ReadAlongPosition {
	block: number;
	word: number;
}

/** After a block's last word, the block stays highlighted this long (a pause before the next one). */
const BLOCK_TAIL_MS = 1500;
/** After a block's last word, the word stays highlighted this long. */
const WORD_TAIL_MS = 250;

/**
 * The block and word being read at `timeMs`, or null before the first block
 * and in long gaps. Binary searches, because it runs on every status update.
 * Same rules as the plugin's `positionAt` used by the web player.
 */
export function positionAt(blocks: readonly ApiAudioBlock[], timeMs: number): ReadAlongPosition | null {
	let lo = 0;
	let hi = blocks.length - 1;
	let found = -1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (blocks[mid]!.startMs <= timeMs) {
			found = mid;
			lo = mid + 1;
		} else hi = mid - 1;
	}
	const block = blocks[found];
	if (!block || timeMs > block.endMs + BLOCK_TAIL_MS) return null;

	const words = block.words;
	const count = Math.floor(words.length / 2);
	let wlo = 0;
	let whi = count - 1;
	let word = -1;
	while (wlo <= whi) {
		const mid = (wlo + whi) >> 1;
		if (words[mid * 2]! <= timeMs) {
			word = mid;
			wlo = mid + 1;
		} else whi = mid - 1;
	}
	if (word === count - 1 && timeMs > words[word * 2 + 1]! + WORD_TAIL_MS) word = -1;
	return { block: found, word };
}

/** A run of a span's text: a word's part (its index in the block) or whitespace (-1). */
export interface WordSegment {
	text: string;
	word: number;
}

/**
 * Splits a block's span texts into segments tagged with the block's word
 * index (the server's tokenisation: whitespace-separated words of the
 * concatenated text), so one word can be highlighted inside nested Text. A word that
 * crosses a mark boundary ("**bold**ed") keeps its index in both spans.
 * The narration's text is the concatenated span text, so the indices match
 * the narration's `words` pairs.
 */
export function splitWords(spans: readonly string[]): WordSegment[][] {
	let word = -1;
	let inWord = false;
	return spans.map((text) => {
		const segments: WordSegment[] = [];
		for (const match of text.matchAll(/\s+|\S+/g)) {
			const isSpace = /^\s/.test(match[0]);
			if (!isSpace && !inWord) word += 1;
			inWord = !isSpace;
			segments.push({ text: match[0], word: isSpace ? -1 : word });
		}
		return segments;
	});
}

/** "m:ss", or "h:mm:ss" from an hour. */
export function formatTime(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Whole minutes of audio, never 0. */
export function listenMinutes(ms: number): number {
	return Math.max(1, Math.round(ms / 60_000));
}

/** "6 min listen" */
export function listenLabel(ms: number): string {
	return `${listenMinutes(ms)} min listen`;
}

/** Playback speeds in the order the speed button cycles through (same as the web). */
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75] as const;

/** The speed after `speed`; unknown values restart the cycle. */
export function nextSpeed(speed: number): number {
	const index = PLAYBACK_SPEEDS.findIndex((value) => value === speed);
	return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length]!;
}

/** "1.25×" */
export function speedLabel(speed: number): string {
	return `${speed}×`;
}

/** A seek target kept inside the file. */
export function clampSeek(ms: number, durationMs: number): number {
	return Math.min(Math.max(0, ms), Math.max(0, durationMs));
}

/** How long the reader's own scrolling keeps follow-along from scrolling the article. */
const FOLLOW_SCROLL_PAUSE_MS = 4000;

/** Follow-along may scroll when the reader has not dragged the article recently. */
export function mayFollowScroll(now: number, lastUserScrollAt: number): boolean {
	return now - lastUserScrollAt >= FOLLOW_SCROLL_PAUSE_MS;
}

/**
 * Where to scroll so a block that has started being read is comfortable to
 * read along: null while it already sits in the band below the top bar and
 * above the lower quarter, otherwise an offset that puts its top at 30 % of
 * the viewport (never above the top of the article).
 */
export function followScrollTarget(input: {
	scrollY: number;
	/** Block's top and height in window coordinates. */
	blockTop: number;
	blockHeight: number;
	viewportTop: number;
	viewportHeight: number;
}): number | null {
	const { scrollY, blockTop, blockHeight, viewportTop, viewportHeight } = input;
	const top = blockTop - viewportTop;
	const comfortable = top >= 0 && top + Math.min(blockHeight, viewportHeight * 0.5) <= viewportHeight * 0.75;
	if (comfortable) return null;
	return Math.max(0, scrollY + top - viewportHeight * 0.3);
}

/** Positions this close to either end are not worth resuming from. */
const RESUME_EDGE_MS = 5000;
/** Resuming starts a little earlier, so the reader hears the sentence again. */
const RESUME_REWIND_MS = 2000;

/** Where a narration should start from a saved position (0 = the beginning). */
export function resumeStartMs(savedMs: number, durationMs: number): number {
	if (!Number.isFinite(savedMs) || savedMs < RESUME_EDGE_MS || savedMs > durationMs - RESUME_EDGE_MS) return 0;
	return Math.max(0, savedMs - RESUME_REWIND_MS);
}

/** The position worth saving, or null to forget it (near the start or finished). */
export function positionToSave(positionMs: number, durationMs: number): number | null {
	return resumeStartMs(positionMs, durationMs) > 0 ? Math.round(positionMs) : null;
}

/** Without progress for this long while it should be playing, the file counts as failed. */
const STALL_MS = 10_000;

/** The player wants to play but the position has not moved for STALL_MS. */
export function isStalled(input: { wantsToPlay: boolean; lastProgressAt: number; now: number }): boolean {
	return input.wantsToPlay && input.now - input.lastProgressAt >= STALL_MS;
}
