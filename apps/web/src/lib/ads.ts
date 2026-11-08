import { getEmDashCollection } from "emdash";
import { selectAd, type AdPlacement } from "./ad-selection";

/** Fetch every matching candidate so expired high-priority ads cannot hide an active one. */
export async function getAds(placements: AdPlacement[]) {
	const { entries, error, cacheHint } = await getEmDashCollection("ads", {
		status: "published",
		where: { placement: placements },
	});
	if (error) console.error("Failed to load ads:", error);
	const candidates = error ? [] : entries.map((entry) => entry.data);
	const now = Date.now();
	return {
		forPlacement: (placement: AdPlacement) => selectAd(candidates, placement, now),
		// Date boundaries change without a CMS write. Render on each request,
		// including when no ad is active yet; purge tags alone are insufficient.
		cacheHint: { ...cacheHint, maxAge: 0, swr: 0 },
	};
}
