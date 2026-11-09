/// <reference types="node" />
// Run with `pnpm --filter @blog/mobile test`: Node's built-in runner strips the types.
import assert from "node:assert/strict";
import { test } from "node:test";
import { initials, splitLinks } from "./text.ts";

const joined = (input: string) =>
	splitLinks(input)
		.map((run) => run.text)
		.join("");

test("initials take the first letter of the first two words", () => {
	assert.equal(initials("jane austen bee"), "JA");
	assert.equal(initials("  Ann  "), "A");
	assert.equal(initials(""), "");
});

test("plain text is a single run", () => {
	assert.deepEqual(splitLinks("Nice post!\nThank you."), [{ text: "Nice post!\nThank you." }]);
	assert.deepEqual(splitLinks(""), []);
});

test("bare URLs become link runs", () => {
	assert.deepEqual(splitLinks("See https://example.com/a?b=1 and http://x.id"), [
		{ text: "See " },
		{ text: "https://example.com/a?b=1", url: "https://example.com/a?b=1" },
		{ text: " and " },
		{ text: "http://x.id", url: "http://x.id" },
	]);
});

test("sentence punctuation and closing brackets stay outside the link", () => {
	assert.deepEqual(splitLinks("Read (https://example.com/post)."), [
		{ text: "Read (" },
		{ text: "https://example.com/post", url: "https://example.com/post" },
		{ text: ")." },
	]);
	assert.deepEqual(splitLinks("at https://example.com, yes"), [
		{ text: "at " },
		{ text: "https://example.com", url: "https://example.com" },
		{ text: ", yes" },
	]);
});

test("a scheme without a host is not a link", () => {
	assert.deepEqual(splitLinks("https://. not a link"), [{ text: "https://. not a link" }]);
});

test("runs always join back to the input", () => {
	for (const input of ["a https://b.c/d. e", "https://x.y", "x\nhttps://y.z/?q=1!\n"]) {
		assert.equal(joined(input), input);
	}
});
