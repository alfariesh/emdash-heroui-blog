import type { InferCollectionData } from "emdash";

export const AD_PLACEMENTS = {
	home: "Home",
	postSidebar: "Article sidebar",
	postBottom: "Below the article",
} as const satisfies Record<string, InferCollectionData<"ads">["placement"][number]>;

export type AdPlacement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];

/**
 * Original seed values remain readable during rollout. The migration converts
 * them to the English choices in both current entries and retained revisions.
 */
const LEGACY_PLACEMENTS: Readonly<Record<string, AdPlacement>> = {
	["Beran" + "da"]: AD_PLACEMENTS.home,
	["Sidebar ar" + "tikel"]: AD_PLACEMENTS.postSidebar,
	["Bawah ar" + "tikel"]: AD_PLACEMENTS.postBottom,
};

/** Also read single-position values while an existing database is being migrated. */
export function inPlacement(stored: unknown, placement: AdPlacement): boolean {
	const values = Array.isArray(stored) ? stored : [stored];
	return values.some((value) => typeof value === "string" &&
		(value === placement || LEGACY_PLACEMENTS[value] === placement));
}

/** Selection also accepts nullable fields from collections created before setup. */
export interface AdCandidate {
	id: string;
	status: string;
	title?: string | null;
	image?: { id: string; src?: string } | null;
	target_url?: string | null;
	placement?: string | readonly string[] | null;
	enabled?: boolean;
	starts_at?: Date | string | null;
	ends_at?: Date | string | null;
	priority?: number | null;
}

function timestamp(value: AdCandidate["starts_at"], fallback: number): number {
	if (value === undefined || value === null || value === "") return fallback;
	return value instanceof Date ? value.getTime() : Date.parse(value);
}

/**
 * CMS URL fields must resolve to an ordinary HTTP(S) destination. Returns it in
 * normalized form, so clients never re-resolve a lenient value like "https:host".
 */
export function adUrl(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	try {
		const url = new URL(value);
		return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

export function isAdUrl(value: unknown): boolean {
	return adUrl(value) !== undefined;
}

function priority(ad: AdCandidate): number {
	return typeof ad.priority === "number" && Number.isFinite(ad.priority) ? ad.priority : 0;
}

function hasBanner(ad: AdCandidate, placement: AdPlacement): boolean {
	return ad.status === "published" && ad.enabled === true && inPlacement(ad.placement, placement) &&
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
