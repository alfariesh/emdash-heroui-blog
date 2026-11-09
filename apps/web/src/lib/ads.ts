import { getEmDashCollection } from "emdash";
import { inPlacement, nextAdChangeAt, selectAd, type AdPlacement } from "./ad-selection";

/** Fetch every matching candidate so expired high-priority ads cannot hide an active one. */
export async function getAds(placements: AdPlacement[]) {
	const { entries, error, cacheHint } = await getEmDashCollection("ads", {
		status: "published",
	});
	if (error) console.error("Failed to load ads:", error);
	// multiSelect is JSON-backed: SQL IN would compare the whole array to a string.
	const candidates = error ? [] : entries.map((entry) => entry.data)
		.filter((ad) => placements.some((placement) => inPlacement(ad.placement, placement)));
	const now = Date.now();
	return {
		error,
		now,
		forPlacement: (placement: AdPlacement) => selectAd(candidates, placement, now),
		validUntil: (placement: AdPlacement) =>
			Math.min(now + 60_000, nextAdChangeAt(candidates, placement, now) ?? Infinity),
		// Date boundaries change without a CMS write. Render on each request,
		// including when no ad is active yet; purge tags alone are insufficient.
		cacheHint: { ...cacheHint, maxAge: 0, swr: 0 },
	};
}
