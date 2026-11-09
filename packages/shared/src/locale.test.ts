import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LOCALE, formatCount, formatDate } from "./locale.ts";
import { formatReadingTime } from "./reading-time.ts";

test("the default locale is English", () => {
	assert.ok(DEFAULT_LOCALE === "en" || DEFAULT_LOCALE === "en-US");
});

test("formatDate uses the English month name", () => {
	const formatted = formatDate("2026-08-04T12:00:00.000Z", "long");
	assert.match(formatted, /August/);
	assert.doesNotMatch(formatted, /Agustus/);
});

test("reading time is an English phrase", () => {
	const label = formatReadingTime(3);
	assert.equal(label, "3 min read");
	assert.equal(label.includes("me" + "nit"), false);
	assert.equal(label.includes("ba" + "ca"), false);
});

test("formatCount uses the singular only for exactly one", () => {
	assert.equal(formatCount(0, "post"), "0 posts");
	assert.equal(formatCount(1, "post"), "1 post");
	assert.equal(formatCount(2, "post"), "2 posts");
	assert.equal(formatCount(1, "more comment"), "1 more comment");
	assert.equal(formatCount(3, "reply", "replies"), "3 replies");
	assert.equal(formatCount(1, "reply", "replies"), "1 reply");
});
