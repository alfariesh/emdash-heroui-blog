/// <reference types="node" />
// Run with `pnpm --filter @blog/mobile test`: Node's built-in runner strips the types.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_POSITIONS, parsePositions, recordPosition, type ReadingPositions } from "./reading-positions.ts";

const now = new Date("2026-11-04T10:00:00.000Z");

test("a half-read article is recorded with a rounded offset", () => {
	assert.deepEqual(recordPosition({}, "a", 1234.6, 0.4, now), {
		a: { offset: 1235, progress: 0.4, savedAt: "2026-11-04T10:00:00.000Z" },
	});
});

test("barely started or finished removes the entry", () => {
	const start = recordPosition({}, "a", 900, 0.5, now);
	assert.deepEqual(recordPosition(start, "a", 10, 0.01, now), {});
	assert.deepEqual(recordPosition(start, "a", 5000, 0.95, now), {});
	assert.deepEqual(recordPosition(start, "a", 9000, 1.7, now), {});
	assert.deepEqual(recordPosition(start, "a", Number.NaN, Number.NaN, now), {});
});

test("other articles are kept when one changes", () => {
	const two = recordPosition(recordPosition({}, "a", 100, 0.2, now), "b", 200, 0.3, now);
	assert.deepEqual(Object.keys(recordPosition(two, "a", 0, 0, now)), ["b"]);
});

test("only the most recent positions are kept", () => {
	let positions: ReadingPositions = {};
	for (let index = 0; index <= MAX_POSITIONS; index++) {
		positions = recordPosition(positions, `post-${index}`, 100, 0.5, new Date(now.getTime() + index * 1000));
	}
	const slugs = Object.keys(positions);
	assert.equal(slugs.length, MAX_POSITIONS);
	assert.ok(!slugs.includes("post-0"), "the oldest entry is dropped");
	assert.ok(slugs.includes(`post-${MAX_POSITIONS}`));
});

test("stored JSON is parsed defensively", () => {
	assert.deepEqual(parsePositions(null), {});
	assert.deepEqual(parsePositions("not json"), {});
	assert.deepEqual(parsePositions("[1,2]"), {});
	const valid = { offset: 300, progress: 0.5, savedAt: "2026-11-04T10:00:00.000Z" };
	assert.deepEqual(
		parsePositions(JSON.stringify({ ok: valid, done: { ...valid, progress: 1 }, broken: { offset: "x" } })),
		{ ok: valid },
	);
});
