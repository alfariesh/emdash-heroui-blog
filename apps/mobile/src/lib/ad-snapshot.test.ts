/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ApiAdSlot } from "@blog/shared";
import { AD_REFRESH_LEAD_MS, adRefreshDelay, createAdSnapshot, MAX_AD_LEASE_MS } from "./ad-snapshot.ts";

const serverTime = Date.parse("2026-11-08T05:00:00Z");
const slot = (ttl: number, ad: ApiAdSlot["ad"] = {
	id: "campaign", title: "Reader offer", targetUrl: "https://blog.example.com/pages/promo",
	image: { url: "https://blog.example.com/banner.png", alt: "Promo", width: 1200, height: 400 },
}): ApiAdSlot => ({
	ad, serverTime: new Date(serverTime).toISOString(),
	validUntil: new Date(serverTime + ttl).toISOString(),
});

test("leases work with skewed device clocks and include time spent waiting for the server", () => {
	for (const deviceTime of [serverTime - 86_400_000, serverTime + 86_400_000]) {
		const snapshot = createAdSnapshot(slot(5000), deviceTime, deviceTime + 1200);
		assert.equal(snapshot.expiresAt, deviceTime + 5000);
		assert.equal(snapshot.ad?.id, "campaign");
		assert.equal(adRefreshDelay(snapshot, deviceTime + 1200), 1000);
	}
});

test("expired responses never show an ad, including latency longer than the lease", () => {
	for (const [ttl, latency] of [[-1, 0], [0, 0], [1000, 1000], [1000, 5000]] as const) {
		assert.equal(createAdSnapshot(slot(ttl), 10_000, 10_000 + latency).ad, null);
	}
});

test("invalid metadata fails closed and unexpectedly long leases are capped", () => {
	for (const field of ["serverTime", "validUntil"] as const) {
		assert.equal(createAdSnapshot({ ...slot(5000), [field]: "invalid" }, 10_000, 10_001).ad, null);
	}
	assert.equal(createAdSnapshot(slot(86_400_000), 10_000, 10_001).expiresAt, 10_000 + MAX_AD_LEASE_MS);
});

test("empty selections refresh for upcoming campaigns and expired leases cannot spin", () => {
	const snapshot = createAdSnapshot(slot(5000, null), 10_000, 11_000);
	assert.equal(snapshot.ad, null);
	assert.equal(adRefreshDelay(snapshot, 11_000), 4000);
	assert.equal(adRefreshDelay(snapshot, 20_000), 1000);
	assert.equal(adRefreshDelay(undefined, 20_000), MAX_AD_LEASE_MS);
});

test("a visible ad is refreshed before its lease ends; an empty slot waits for the boundary", () => {
	const showing = createAdSnapshot(slot(MAX_AD_LEASE_MS), 10_000, 10_000);
	assert.equal(adRefreshDelay(showing, 10_000), MAX_AD_LEASE_MS - AD_REFRESH_LEAD_MS);
	assert.ok(10_000 + adRefreshDelay(showing, 10_000) < showing.expiresAt);
	const empty = createAdSnapshot(slot(MAX_AD_LEASE_MS, null), 10_000, 10_000);
	assert.equal(adRefreshDelay(empty, 10_000), MAX_AD_LEASE_MS);
	assert.equal(adRefreshDelay(empty, 10_000 + MAX_AD_LEASE_MS - 3000), 3000);
});
