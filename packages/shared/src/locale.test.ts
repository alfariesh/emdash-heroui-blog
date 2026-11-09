import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LOCALE, formatDate } from "./locale.ts";
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
