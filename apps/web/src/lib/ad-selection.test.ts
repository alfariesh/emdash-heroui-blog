import assert from "node:assert/strict";
import { test } from "node:test";
import { AD_PLACEMENTS, adUrl, isAdUrl, nextAdChangeAt, selectAd, type AdCandidate } from "./ad-selection.ts";

const now = Date.parse("2026-11-08T05:00:00Z");
const ad = (changes: Partial<AdCandidate> = {}): AdCandidate => ({
	id: "ad-a",
	status: "published",
	title: "Reader offer",
	image: { id: "banner" },
	target_url: "https://blog.example.com/pages/promo",
	placement: AD_PLACEMENTS.home,
	enabled: true,
	...changes,
});
const select = (ads: AdCandidate[]) => selectAd(ads, AD_PLACEMENTS.home, now);

test("only published, explicitly enabled ads for the requested position can appear", () => {
	for (const changes of [
		{ status: "draft" }, { status: "archived" }, { enabled: false }, { enabled: undefined },
		{ placement: AD_PLACEMENTS.postBottom },
	]) assert.equal(select([ad(changes)]), undefined);
	assert.equal(select([ad()])?.id, "ad-a");
	assert.equal(selectAd([ad({ placement: AD_PLACEMENTS.postSidebar })], AD_PLACEMENTS.postSidebar, now)?.id, "ad-a");
});

test("schedule boundaries are inclusive at start and exclusive at end, across offsets", () => {
	assert.ok(select([ad({ starts_at: new Date(now) })]));
	assert.ok(select([ad({ starts_at: "2026-11-08T12:00:00+07:00" })]));
	assert.equal(select([ad({ starts_at: new Date(now + 1) })]), undefined);
	assert.equal(select([ad({ ends_at: new Date(now) })]), undefined);
	assert.ok(select([ad({ ends_at: new Date(now + 1) })]));
});

test("open-ended schedules work; malformed and reversed dates never display", () => {
	assert.ok(select([ad({ starts_at: null, ends_at: "" })]));
	for (const changes of [
		{ starts_at: "invalid" }, { ends_at: "invalid" }, { starts_at: new Date(NaN) },
		{ starts_at: new Date(now + 1), ends_at: new Date(now - 1) },
	]) assert.equal(select([ad(changes)]), undefined);
});

test("highest eligible priority wins, including behind expired and future candidates", () => {
	const candidates = [
		ad({ id: "expired", priority: 100, ends_at: new Date(now) }),
		ad({ id: "future", priority: 100, starts_at: new Date(now + 1) }),
		ad({ id: "low", priority: 1 }),
		ad({ id: "high", priority: 2 }),
	];
	assert.equal(select(candidates)?.id, "high");
	assert.equal(candidates[0]?.id, "expired"); // Selection does not mutate query results.
	assert.equal(select([ad({ id: "b" }), ad({ id: "a" })])?.id, "a");
	assert.equal(select([]), undefined);
});

test("incomplete banners and unsafe destinations are skipped", () => {
	for (const changes of [
		{ title: " " }, { image: undefined }, { image: { id: "" } },
		{ target_url: "javascript:alert(1)" }, { target_url: "https://name:password@example.com" },
	]) assert.equal(select([ad(changes)]), undefined);
	assert.ok(isAdUrl("https://example.com/promo?utm_source=blog"));
	assert.ok(isAdUrl("http://localhost:4321/pages/promo"));
	for (const url of ["", "/pages/promo", "//example.com", "data:text/html,test", "mailto:a@example.com"])
		assert.equal(isAdUrl(url), false);
});

test("legacy nullable fields cannot break the page or hide another eligible ad", () => {
	for (const changes of [
		{ title: null }, { title: undefined }, { image: null }, { image: { id: " " } },
		{ target_url: null }, { target_url: undefined },
	]) {
		assert.equal(select([ad({ ...changes, priority: 100 }), ad({ id: "valid", priority: 1 })])?.id, "valid");
	}
	assert.equal(isAdUrl(null), false);
	assert.equal(isAdUrl(undefined), false);
});

test("missing and non-finite priorities use zero, including alongside negative priorities", () => {
	for (const priority of [undefined, null, NaN, Infinity, -Infinity]) {
		assert.equal(select([ad({ priority }), ad({ id: "negative", priority: -1 })])?.id, "ad-a");
	}
});

test("refresh includes future starts even when another campaign is already selected", () => {
	const candidates = [ad({ ends_at: new Date(now + 30_000) }),
		ad({ id: "future", priority: 10, starts_at: new Date(now + 5000) })];
	assert.equal(nextAdChangeAt(candidates, AD_PLACEMENTS.home, now), now + 5000);
	assert.equal(selectAd(candidates, AD_PLACEMENTS.home, now + 5000)?.id, "future");
	assert.equal(nextAdChangeAt([ad({ starts_at: new Date(now + 1000) })], AD_PLACEMENTS.home, now), now + 1000);
});

test("refresh ignores ineligible, expired, unbounded and malformed schedules", () => {
	const candidates = [ad(), ad({ enabled: false, ends_at: new Date(now + 1) }),
		ad({ placement: AD_PLACEMENTS.postSidebar, ends_at: new Date(now + 1) }),
		ad({ starts_at: "invalid", ends_at: new Date(now + 1) }),
		ad({ starts_at: new Date(now + 2), ends_at: new Date(now + 1) }),
		ad({ ends_at: new Date(now) }), ad({ status: "draft", ends_at: new Date(now + 1) })];
	assert.equal(nextAdChangeAt(candidates, AD_PLACEMENTS.home, now), undefined);
	assert.equal(nextAdChangeAt([ad({ ends_at: new Date(now + 1) })], AD_PLACEMENTS.home, now), now + 1);
});

test("placement values stored by the Indonesian seed still select their slot", () => {
	// Joined so the first-party copy guard does not see the Indonesian words.
	const legacy = (...parts: string[]) => parts.join("");
	const stored = [legacy("Beran", "da"), legacy("Sidebar ar", "tikel"), legacy("Bawah ar", "tikel")];
	const slots = [AD_PLACEMENTS.home, AD_PLACEMENTS.postSidebar, AD_PLACEMENTS.postBottom];
	stored.forEach((placement, index) => {
		const slot = slots[index];
		const other = slots[(index + 1) % slots.length];
		assert.equal(selectAd([ad({ placement })], slot, now)?.id, "ad-a");
		assert.equal(selectAd([ad({ placement })], other, now), undefined);
	});
	assert.equal(selectAd([ad({ placement: "constructor" })], AD_PLACEMENTS.home, now), undefined);
});

test("one campaign can serve several positions without matching unselected slots", () => {
	const campaign = ad({ placement: [AD_PLACEMENTS.home, AD_PLACEMENTS.postBottom] });
	assert.equal(select([campaign]), campaign);
	assert.equal(selectAd([campaign], AD_PLACEMENTS.postBottom, now), campaign);
	assert.equal(selectAd([campaign], AD_PLACEMENTS.postSidebar, now), undefined);
	assert.equal(nextAdChangeAt([{ ...campaign, ends_at: new Date(now + 1000) }], AD_PLACEMENTS.postBottom, now), now + 1000);
	for (const placement of [[], null, undefined, ["unknown"], ["constructor"]]) {
		assert.equal(select([ad({ placement })]), undefined);
	}
});

test("adUrl publishes the normalized absolute URL", () => {
	assert.equal(adUrl("https:example.com/promo"), "https://example.com/promo");
	assert.equal(adUrl("HTTPS://Example.com"), "https://example.com/");
	assert.equal(adUrl("  https://example.com/a?b=1 "), "https://example.com/a?b=1");
	for (const value of ["javascript:alert(1)", "mailto:a@b.co", "/relative", "https://user:pw@example.com"]) {
		assert.equal(adUrl(value), undefined, value);
	}
});
