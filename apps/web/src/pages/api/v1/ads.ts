import type { ApiAdPlacement, ApiAdSlot } from "@blog/shared";
import type { APIRoute } from "astro";
import { AD_PLACEMENTS, type AdPlacement } from "../../../lib/ad-selection";
import { getAds } from "../../../lib/ads";
import { handle, jsonError, jsonOk, NO_STORE, toApiImage } from "../../../lib/public-api";

const placements = {
	home: AD_PLACEMENTS.home,
	post_bottom: AD_PLACEMENTS.postBottom,
} satisfies Record<ApiAdPlacement, AdPlacement>;

/** Select one CMS-managed banner without exposing drafts, credentials, or stale schedules. */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const key = context.url.searchParams.get("placement");
		if (key !== "home" && key !== "post_bottom") {
			return jsonError("bad_request", "The ad placement is invalid.");
		}
		const placement = placements[key];
		const ads = await getAds([placement]);
		if (ads.error) throw ads.error;
		const ad = ads.forPlacement(placement);
		const image = ad ? toApiImage(context, ad.image) : null;
		const slot: ApiAdSlot = {
			ad: ad && image ? {
				id: ad.id,
				title: ad.title,
				image,
				targetUrl: ad.target_url,
			} : null,
			serverTime: new Date(ads.now).toISOString(),
			validUntil: new Date(ads.validUntil(placement)).toISOString(),
		};
		return jsonOk(slot, NO_STORE);
	});
