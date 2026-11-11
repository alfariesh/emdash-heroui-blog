import assert from "node:assert/strict";
import { test } from "node:test";
import { positionAt, wordRanges } from "emdash-plugin-article-audio/client";
import { normalize, wordOffsets } from "./read-along.ts";

test("page words are counted the way the narration counts them", () => {
	// Rendered text keeps Astro's indentation and line breaks; words stay the same.
	const rendered = "\n\t\tEmDash is a  fast\nCMS.\n";
	assert.deepEqual(
		wordOffsets(rendered).map(([s, e]) => rendered.slice(s, e)),
		["EmDash", "is", "a", "fast", "CMS."],
	);
	assert.deepEqual(wordOffsets("a b"), wordRanges("a b"));
	assert.equal(normalize(rendered), "EmDash is a fast CMS.");
});

test("the playhead maps to a block and word", () => {
	const narration = {
		blocks: [{ key: "p", kind: "paragraph" as const, text: "one two", startMs: 0, endMs: 900, words: [0, 400, 450, 900] }],
	};
	assert.deepEqual(positionAt(narration, 500), { block: 0, word: 1 });
});
