import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, getCategoryIcon, isCategoryIconKey } from "./category-icons.ts";

test("seeded category slugs resolve to their icons", () => {
	assert.equal(getCategoryIcon("development"), "code");
	assert.equal(getCategoryIcon("design"), "design");
	assert.equal(getCategoryIcon("notes"), "note");
});

test("slugs from the original seed keep the icon of their English slug", () => {
	const slug = (left: string, right: string) => left + right;
	assert.equal(getCategoryIcon(slug("pengem", "bangan")), getCategoryIcon("development"));
	assert.equal(getCategoryIcon(slug("des", "ain")), getCategoryIcon("design"));
	assert.equal(getCategoryIcon(slug("cata", "tan")), getCategoryIcon("notes"));
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
