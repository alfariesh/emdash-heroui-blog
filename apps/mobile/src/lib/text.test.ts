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
	assert.equal(initials("siti rahma dewi"), "SR");
	assert.equal(initials("  Budi  "), "B");
	assert.equal(initials(""), "");
});

test("plain text is a single run", () => {
	assert.deepEqual(splitLinks("Tulisan bagus!\nTerima kasih."), [{ text: "Tulisan bagus!\nTerima kasih." }]);
	assert.deepEqual(splitLinks(""), []);
});

test("bare URLs become link runs", () => {
	assert.deepEqual(splitLinks("Lihat https://example.com/a?b=1 dan http://x.id"), [
		{ text: "Lihat " },
		{ text: "https://example.com/a?b=1", url: "https://example.com/a?b=1" },
		{ text: " dan " },
		{ text: "http://x.id", url: "http://x.id" },
	]);
});

test("sentence punctuation and closing brackets stay outside the link", () => {
	assert.deepEqual(splitLinks("Baca (https://example.com/post)."), [
		{ text: "Baca (" },
		{ text: "https://example.com/post", url: "https://example.com/post" },
		{ text: ")." },
	]);
	assert.deepEqual(splitLinks("di https://example.com, ya"), [
		{ text: "di " },
		{ text: "https://example.com", url: "https://example.com" },
		{ text: ", ya" },
	]);
});

test("a scheme without a host is not a link", () => {
	assert.deepEqual(splitLinks("https://. bukan tautan"), [{ text: "https://. bukan tautan" }]);
});

test("runs always join back to the input", () => {
	for (const input of ["a https://b.c/d. e", "https://x.y", "x\nhttps://y.z/?q=1!\n"]) {
		assert.equal(joined(input), input);
	}
});
