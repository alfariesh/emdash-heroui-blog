/// <reference types="node" />
// Run with `pnpm --filter @blog/mobile test`: Node's built-in runner strips the types.
import type { ApiAudioBlock } from "@blog/shared";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
	clampSeek,
	followScrollTarget,
	formatTime,
	isStalled,
	listenLabel,
	listenMinutes,
	mayFollowScroll,
	nextSpeed,
	positionAt,
	positionToSave,
	resumeStartMs,
	splitWords,
} from "./read-along.ts";

const block = (key: string, text: string, words: number[]): ApiAudioBlock => ({
	key,
	kind: "paragraph",
	text,
	startMs: words[0] ?? 0,
	endMs: words.at(-1) ?? 0,
	words,
});

const BLOCKS = [
	block("title", "Hello world", [0, 400, 450, 900]),
	block("a", "One two three", [2000, 2300, 2350, 2700, 2750, 3200]),
	block("b", "Later", [10_000, 10_500]),
];

test("positionAt finds the block and word at a time", () => {
	assert.equal(positionAt(BLOCKS, -1), null);
	assert.deepEqual(positionAt(BLOCKS, 0), { block: 0, word: 0 });
	assert.deepEqual(positionAt(BLOCKS, 460), { block: 0, word: 1 });
	assert.deepEqual(positionAt(BLOCKS, 2360), { block: 1, word: 1 });
	assert.deepEqual(positionAt(BLOCKS, 2749), { block: 1, word: 1 });
	assert.deepEqual(positionAt(BLOCKS, 10_100), { block: 2, word: 0 });
});

test("positionAt keeps the last word briefly, the block a little longer, then nothing", () => {
	assert.deepEqual(positionAt(BLOCKS, 3400), { block: 1, word: 2 });
	assert.deepEqual(positionAt(BLOCKS, 3500), { block: 1, word: -1 });
	assert.equal(positionAt(BLOCKS, 5000), null);
	assert.equal(positionAt([], 100), null);
});

test("positionAt handles a block without word timings (estimated narration)", () => {
	const blocks = [{ ...block("x", "No words", []), startMs: 0, endMs: 1000 }];
	assert.deepEqual(positionAt(blocks, 500), { block: 0, word: -1 });
});

test("splitWords numbers words across spans like the concatenated text", () => {
	const spans = ["Hello ", "wor", "ld and", " more  text"];
	const segments = splitWords(spans);
	assert.deepEqual(segments, [
		[
			{ text: "Hello", word: 0 },
			{ text: " ", word: -1 },
		],
		[{ text: "wor", word: 1 }],
		[
			{ text: "ld", word: 1 },
			{ text: " ", word: -1 },
			{ text: "and", word: 2 },
		],
		[
			{ text: " ", word: -1 },
			{ text: "more", word: 3 },
			{ text: "  ", word: -1 },
			{ text: "text", word: 4 },
		],
	]);
	// Segments rebuild every span exactly, and agree with the server's count.
	assert.deepEqual(
		segments.map((span) => span.map((segment) => segment.text).join("")),
		spans,
	);
	// The last index + 1 is the server's word count: whitespace-separated tokens of the joined text.
	const lastWord = Math.max(...segments.flat().map((segment) => segment.word));
	assert.equal(lastWord + 1, spans.join("").split(/\s+/).filter(Boolean).length);
	assert.deepEqual(splitWords(["", "x"]), [[], [{ text: "x", word: 0 }]]);
});

test("formatTime and listenLabel", () => {
	assert.equal(formatTime(0), "0:00");
	assert.equal(formatTime(65_400), "1:05");
	assert.equal(formatTime(3_725_000), "1:02:05");
	assert.equal(formatTime(-5), "0:00");
	assert.equal(listenLabel(10_000), "1 min listen");
	assert.equal(listenLabel(370_000), "6 min listen");
	assert.equal(listenMinutes(0), 1);
});

test("nextSpeed cycles and recovers from unknown speeds", () => {
	assert.equal(nextSpeed(1), 1.25);
	assert.equal(nextSpeed(2), 0.75);
	assert.equal(nextSpeed(0.75), 1);
	assert.equal(nextSpeed(3), 1);
});

test("clampSeek stays inside the file", () => {
	assert.equal(clampSeek(-10_000, 60_000), 0);
	assert.equal(clampSeek(70_000, 60_000), 60_000);
	assert.equal(clampSeek(5000, 60_000), 5000);
});

test("follow-along waits for the reader's scrolling to settle", () => {
	assert.equal(mayFollowScroll(10_000, 7000), false);
	assert.equal(mayFollowScroll(11_000, 7000), true);
	assert.equal(mayFollowScroll(1000, 0), false);
	assert.equal(mayFollowScroll(1000, -Infinity), true);
});

test("followScrollTarget scrolls only when the block is out of the reading band", () => {
	const base = { scrollY: 1000, viewportTop: 100, viewportHeight: 700, blockHeight: 60 };
	// Comfortably visible.
	assert.equal(followScrollTarget({ ...base, blockTop: 300 }), null);
	// Below the band: its top goes to 30 % of the viewport.
	assert.equal(followScrollTarget({ ...base, blockTop: 700 }), 1000 + 600 - 210);
	// Under the top bar.
	assert.equal(followScrollTarget({ ...base, blockTop: 50 }), 1000 - 50 - 210);
	// Never above the article's top.
	assert.equal(followScrollTarget({ ...base, scrollY: 0, blockTop: 120 + 0 - 100 }), 0);
});

test("resumeStartMs rewinds a little and ignores the ends", () => {
	assert.equal(resumeStartMs(3000, 60_000), 0);
	assert.equal(resumeStartMs(30_000, 60_000), 28_000);
	assert.equal(resumeStartMs(57_000, 60_000), 0);
	assert.equal(resumeStartMs(Number.NaN, 60_000), 0);
	assert.equal(positionToSave(30_400.4, 60_000), 30_400);
	assert.equal(positionToSave(59_000, 60_000), null);
	assert.equal(positionToSave(1000, 60_000), null);
});

test("isStalled only while the player should be playing", () => {
	assert.equal(isStalled({ wantsToPlay: true, lastProgressAt: 0, now: 9_999 }), false);
	assert.equal(isStalled({ wantsToPlay: true, lastProgressAt: 0, now: 10_000 }), true);
	assert.equal(isStalled({ wantsToPlay: false, lastProgressAt: 0, now: 60_000 }), false);
});
