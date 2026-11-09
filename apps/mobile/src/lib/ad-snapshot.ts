import type { ApiAdSlot } from "@blog/shared";

/** Client-side safety cap; ads are never kept with the offline reading cache. */
export const MAX_AD_LEASE_MS = 60_000;

export interface AdSnapshot {
	ad: ApiAdSlot["ad"];
	expiresAt: number;
}

/** Convert the server lease to device time, conservatively including request latency. */
export function createAdSnapshot(slot: ApiAdSlot, requestedAt: number, receivedAt: number): AdSnapshot {
	const lease = Date.parse(slot.validUntil) - Date.parse(slot.serverTime);
	const duration = Number.isFinite(lease) ? Math.max(0, Math.min(lease, MAX_AD_LEASE_MS)) : 0;
	const expiresAt = requestedAt + duration;
	return { ad: expiresAt > receivedAt ? slot.ad : null, expiresAt };
}

/** A visible ad is replaced this long before its lease ends, so the slot never goes blank between leases. */
export const AD_REFRESH_LEAD_MS = 5000;

/**
 * Refresh at the next boundary, a little early while an ad is showing, with a
 * minimum delay to avoid tight polling loops.
 */
export function adRefreshDelay(snapshot: AdSnapshot | undefined, now: number): number {
	if (!snapshot) return MAX_AD_LEASE_MS;
	const lead = snapshot.ad ? AD_REFRESH_LEAD_MS : 0;
	return Math.max(1000, Math.min(MAX_AD_LEASE_MS, snapshot.expiresAt - now - lead));
}
