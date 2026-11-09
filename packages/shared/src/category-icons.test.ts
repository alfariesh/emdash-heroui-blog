import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, getCategoryIcon, isCategoryIconKey } from "./category-icons.ts";

test("seeded category slugs resolve to their icons", () => {
	assert.equal(getCategoryIcon("development"), "code");
	assert.equal(getCategoryIcon("design"), "design");
	assert.equal(getCategoryIcon("notes"), "note");
});

test("slugs from the Indonesian seed keep the icon of their English slug", () => {
	assert.equal(getCategoryIcon("pengembangan"), getCategoryIcon("development"));
	assert.equal(getCategoryIcon("desain"), getCategoryIcon("design"));
	assert.equal(getCategoryIcon("catatan"), getCategoryIcon("notes"));
});

test("unknown slugs fall back to the default icon", () => {
	assert.equal(getCategoryIcon("something-new"), DEFAULT_CATEGORY_ICON);
	assert.equal(getCategoryIcon(""), DEFAULT_CATEGORY_ICON);
});

test("slugs that match Object.prototype members never leak a non-key", () => {
	for (const slug of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
		assert.equal(getCategoryIcon(slug), DEFAULT_CATEGORY_ICON, slug);
	}
});

test("every mapped icon is a valid key", () => {
	for (const key of Object.values(CATEGORY_ICONS)) assert.ok(isCategoryIconKey(key), key);
});
