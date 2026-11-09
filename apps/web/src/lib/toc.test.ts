import assert from "node:assert/strict";
import { test } from "node:test";
import {
	TICK_PITCH,
	TOC_LINE,
	activeIndex,
	ease,
	labelWeight,
	readingPosition,
	slugifyHeading,
	tickCenter,
	tickCount,
	tickWeight,
	uniqueId,
} from "./toc.ts";

test("slugifyHeading makes readable ids", () => {
	assert.equal(slugifyHeading("Apa yang bertahan"), "apa-yang-bertahan");
	assert.equal(slugifyHeading("  Kenapa 5 aturan ini penting?  "), "kenapa-5-aturan-ini-penting");
	assert.equal(slugifyHeading("Café & Crème brûlée"), "cafe-creme-brulee");
	assert.equal(slugifyHeading("Tips: HTML/CSS"), "tips-html-css");
});

test("slugifyHeading keeps non-latin letters and gives up on pure symbols", () => {
	assert.equal(slugifyHeading("ملخص سريع"), "ملخص-سريع");
	assert.equal(slugifyHeading("🚀 ✨"), "");
	assert.equal(slugifyHeading("---"), "");
});

test("slugifyHeading caps the length without leaving a trailing dash", () => {
	const id = slugifyHeading(`${"kata ".repeat(30)}akhir`);
	assert.ok(id.length <= 80);
	assert.ok(!id.endsWith("-"));
});

test("uniqueId only suffixes when the id is taken", () => {
	assert.equal(uniqueId("intro", new Set()), "intro");
	assert.equal(uniqueId("intro", new Set(["intro"])), "intro-2");
	assert.equal(uniqueId("intro", new Set(["intro", "intro-2"])), "intro-3");
});

test("activeIndex is the last entry at or above the line", () => {
	const tops = [100, 400, 900];
	assert.equal(activeIndex(tops, 50), -1);
	assert.equal(activeIndex(tops, 100), 0);
	assert.equal(activeIndex(tops, 399), 0);
	assert.equal(activeIndex(tops, 400), 1);
	assert.equal(activeIndex(tops, 5000), 2);
	assert.equal(activeIndex([], 10), -1);
});

test("readingPosition rests on the first entry before the article and on the last at its end", () => {
	const tops = [100, 400, 900];
	const anchors = [9, 45, 81];
	assert.equal(readingPosition(tops, anchors, 0), 9);
	assert.equal(readingPosition(tops, anchors, 900), 81);
	assert.equal(readingPosition(tops, anchors, 4000), 81);
});

test("readingPosition drifts from one anchor to the next across a section", () => {
	const tops = [100, 400, 900];
	const anchors = [9, 45, 81];
	assert.equal(readingPosition(tops, anchors, 100), 9);
	assert.equal(readingPosition(tops, anchors, 250), 27);
	assert.equal(readingPosition(tops, anchors, 650), 63);
	// Never leaves the segment it is in.
	assert.ok(readingPosition(tops, anchors, 399.9) <= 45);
});

test("readingPosition copes with empty lists and sections that share a top", () => {
	assert.equal(readingPosition([], [], 100), 0);
	assert.equal(readingPosition([100, 100], [9, 45], 100), 45);
});

test("tickCount and tickCenter put ticks on the text lines", () => {
	assert.equal(tickCount(0), 0);
	assert.equal(tickCount(TOC_LINE - 1), 0);
	// A single line: one tick, on its centre.
	assert.equal(tickCount(TOC_LINE), 1);
	assert.equal(tickCenter(0), TOC_LINE / 2);
	// Three lines' worth of height: nine ticks, the last on the third line's centre.
	assert.equal(tickCount(TOC_LINE * 3), 9);
	assert.equal(tickCenter(8) - tickCenter(0), TOC_LINE * 2);
	// An entry's first line stays on a tick whatever its neighbours' length, as long as
	// the gap between entries (15px in the CSS) is a multiple of the pitch.
	assert.equal(TOC_LINE % TICK_PITCH, 0);
	assert.equal(15 % TICK_PITCH, 0);
});

test("weights peak at the cursor, are symmetric and fade out", () => {
	for (const weight of [tickWeight, labelWeight]) {
		assert.equal(weight(0), 1);
		assert.equal(weight(12), weight(-12));
		assert.ok(weight(6) > weight(12));
		assert.ok(weight(12) > weight(30));
		assert.ok(weight(200) < 0.001);
	}
	// A label next to the cursor keeps only a little emphasis, and halfway between
	// two labels both share it.
	assert.ok(labelWeight(36) < 0.15);
	assert.ok(labelWeight(18) > 0.5);
});

test("ease closes the gap at a rate independent of frame length", () => {
	assert.equal(ease(10, 50, 0, 100), 10);
	assert.ok(ease(10, 50, 16, 100) > 10 && ease(10, 50, 16, 100) < 50);
	const oneStep = ease(0, 100, 32, 100);
	const twoSteps = ease(ease(0, 100, 16, 100), 100, 16, 100);
	assert.ok(Math.abs(oneStep - twoSteps) < 1e-9);
	assert.ok(Math.abs(ease(0, 100, 5000, 100) - 100) < 1e-6);
});
