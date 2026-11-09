import type { InferCollectionData } from "emdash";

export const AD_PLACEMENTS = {
	home: "Home",
	postSidebar: "Article sidebar",
	postBottom: "Below the article",
} as const satisfies Record<string, InferCollectionData<"ads">["placement"]>;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];

/** Selection also accepts nullable fields from collections created before setup. */
export interface AdCandidate {
	id: string;
	status: string;
	title?: string | null;
	image?: { id: string; src?: string } | null;
	target_url?: string | null;
	placement: string;
	enabled?: boolean;
	starts_at?: Date | string | null;
	ends_at?: Date | string | null;
	priority?: number | null;
}

function timestamp(value: AdCandidate["starts_at"], fallback: number): number {
	if (value === undefined || value === null || value === "") return fallback;
	return value instanceof Date ? value.getTime() : Date.parse(value);
}

/** CMS URL fields must resolve to an ordinary HTTP(S) destination. */
export function isAdUrl(value: unknown): boolean {
	if (typeof value !== "string") return false;
	try {
		const url = new URL(value);
		return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
	} catch {
		return false;
	}
}

function priority(ad: AdCandidate): number {
	return typeof ad.priority === "number" && Number.isFinite(ad.priority) ? ad.priority : 0;
}

function hasBanner(ad: AdCandidate, placement: AdPlacement): boolean {
	return ad.status === "published" && ad.enabled === true && ad.placement === placement &&
		typeof ad.title === "string" && ad.title.trim().length > 0 &&
		Boolean(ad.image?.id?.trim() || ad.image?.src?.trim()) && isAdUrl(ad.target_url);
}

/** Earliest future eligibility change, including campaigns that have not started yet. */
export function nextAdChangeAt(
	ads: readonly AdCandidate[],
	placement: AdPlacement,
	now: number,
): number | undefined {
	let next = Infinity;
	for (const ad of ads) {
		if (!hasBanner(ad, placement)) continue;
		const start = timestamp(ad.starts_at, -Infinity);
		const end = timestamp(ad.ends_at, Infinity);
		if (!(start < end)) continue;
		if (start > now) next = Math.min(next, start);
		if (end > now) next = Math.min(next, end);
	}
	return Number.isFinite(next) ? next : undefined;
}

/** Start is inclusive; end is exclusive. Invalid schedules fail closed. */
export function selectAd<T extends AdCandidate>(
	ads: readonly T[],
	placement: AdPlacement,
	now = Date.now(),
): T | undefined {
	return ads
		.filter((ad) => {
			const start = timestamp(ad.starts_at, -Infinity);
			const end = timestamp(ad.ends_at, Infinity);
			return hasBanner(ad, placement) && start <= now && now < end;
		})
		.sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id))[0];
}
