/**
 * Helpers for the public, read-only JSON API under `src/pages/api/v1/`.
 *
 * The response shapes come from `@blog/shared` (the API contract). Everything
 * here turns EmDash entries into those shapes: only published content, and
 * every URL absolute, built from the public origin (see site-url.ts).
 */
import type {
	ApiByline,
	ApiComment,
	ApiError,
	ApiErrorCode,
	ApiImage,
	ApiPage,
	ApiPortableTextBlock,
	ApiPostSummary,
	ApiSuccess,
	ApiTermRef,
} from "@blog/shared";
import { DEFAULT_PAGE_SIZE, getCategoryIcon, getReadingTime, MAX_PAGE_SIZE } from "@blog/shared";
import type { APIContext } from "astro";
import type {
	ContentBylineCredit,
	ContentEntry,
	GetCommentsResult,
	PortableTextBlock,
	TaxonomyTerm,
} from "emdash";
import { InvalidCursorError } from "emdash";
import { publicOrigin } from "./site-url";

const INTERNAL_MEDIA_PREFIX = "/_emdash/api/media/file/";

const CACHE_OK = "public, max-age=60, stale-while-revalidate=300";
const CACHE_ERROR = "no-store";
/** For writes and schedule-sensitive selections: never cached. */
export const NO_STORE = "no-store";

const BASE_HEADERS = {
	"Content-Type": "application/json; charset=utf-8",
	// Public, read-only data: let Expo web and other browser clients read it.
	"Access-Control-Allow-Origin": "*",
	"X-Content-Type-Options": "nosniff",
};

// ── Responses ───────────────────────────────────────────────────────────────

export function jsonOk<T>(data: T, cacheControl = CACHE_OK): Response {
	const body: ApiSuccess<T> = { ok: true, data };
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { ...BASE_HEADERS, "Cache-Control": cacheControl },
	});
}

/**
 * CORS preflight for the write endpoints. Native apps send none; this is
 * for browser clients such as the Expo web preview.
 */
export function preflight(methods: string): Response {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": methods,
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Max-Age": "86400",
		},
	});
}

export function jsonPage<T>(data: T[], nextCursor: string | null | undefined): Response {
	const body: ApiPage<T> = { ok: true, data, nextCursor: nextCursor ?? null };
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { ...BASE_HEADERS, "Cache-Control": CACHE_OK },
	});
}

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
	bad_request: 400,
	not_found: 404,
	too_many_requests: 429,
	internal_error: 500,
};

export function jsonError(code: ApiErrorCode, message: string): Response {
	const status = STATUS_FOR_CODE[code];
	const body: ApiError = { ok: false, error: { status, code, message } };
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...BASE_HEADERS, "Cache-Control": CACHE_ERROR },
	});
}

export const notFound = (message = "Content not found.") => jsonError("not_found", message);

const INVALID_CURSOR_MESSAGE = /invalid (pagination )?cursor/i;

/**
 * Search throws `InvalidCursorError` directly, but collection queries go
 * through Astro's live loader, which re-wraps it as a plain error
 * ("Failed to load collection: Invalid pagination cursor: …").
 */
function isInvalidCursor(error: unknown): boolean {
	for (let current = error, depth = 0; current && depth < 5; depth++) {
		if (current instanceof InvalidCursorError) return true;
		if (current instanceof Error && INVALID_CURSOR_MESSAGE.test(current.message)) return true;
		current = current instanceof Error ? current.cause : undefined;
	}
	return false;
}

/**
 * Runs an endpoint body and turns thrown errors into JSON: a bad cursor
 * becomes 400, anything else 500 (logged, details not leaked).
 */
export async function handle(run: () => Promise<Response>): Promise<Response> {
	try {
		return await run();
	} catch (error) {
		if (isInvalidCursor(error)) {
			return jsonError("bad_request", "The cursor parameter is invalid.");
		}
		console.error("[api/v1]", error);
		return jsonError("internal_error", "Something went wrong on the server.");
	}
}

// ── Query parameters ────────────────────────────────────────────────────────

/** Parses `?limit=`; returns null when present but not an integer in 1–50. */
export function parseLimit(url: URL): number | null {
	const raw = url.searchParams.get("limit");
	if (raw === null || raw === "") return DEFAULT_PAGE_SIZE;
	if (!/^\d+$/.test(raw)) return null;
	const value = Number(raw);
	return value >= 1 && value <= MAX_PAGE_SIZE ? value : null;
}

export function param(url: URL, name: string): string | undefined {
	const value = url.searchParams.get(name)?.trim();
	return value ? value : undefined;
}

// ── URLs ────────────────────────────────────────────────────────────────────

/** Makes a root-relative or protocol-relative URL absolute against `origin`. */
export function absoluteUrl(value: string, origin: string): string {
	if (!value) return value;
	try {
		return new URL(value, `${origin}/`).toString();
	} catch {
		return value;
	}
}

/** Like `absoluteUrl`, but only for `/path` links; leaves mailto:, #anchor etc. alone. */
function absoluteLink(value: string, origin: string): string {
	return value.startsWith("/") ? absoluteUrl(value, origin) : value;
}

function mediaUrl(
	context: APIContext,
	ref: { storageKey?: string; url?: string; id?: string },
): string | null {
	const resolve = context.locals.emdash?.getPublicMediaUrl;
	let url = "";
	if (ref.storageKey) {
		url = resolve ? resolve(ref.storageKey) : `${INTERNAL_MEDIA_PREFIX}${ref.storageKey}`;
	} else if (ref.url) {
		url = ref.url;
	} else if (ref.id) {
		// A bare media id: only the internal file route can resolve it.
		url = `${INTERNAL_MEDIA_PREFIX}${ref.id}`;
	}
	return url ? absoluteUrl(url, publicOrigin(context)) : null;
}

const asString = (value: unknown) => (typeof value === "string" && value ? value : undefined);
const asDimension = (value: unknown) =>
	typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/** An image field value (`{ id, src?, alt?, meta: { storageKey } }`) → ApiImage. */
export function toApiImage(context: APIContext, value: unknown): ApiImage | null {
	if (!value || typeof value !== "object") return null;
	const image = value as Record<string, unknown>;
	const meta = (image.meta ?? {}) as Record<string, unknown>;
	const url = mediaUrl(context, {
		storageKey: asString(meta.storageKey),
		url: asString(image.src) ?? asString(image.url),
		id: asString(image.id),
	});
	if (!url) return null;
	return {
		url,
		alt: asString(image.alt) ?? "",
		width: asDimension(image.width),
		height: asDimension(image.height),
	};
}

// ── Bylines and terms ───────────────────────────────────────────────────────

export function toApiBylines(context: APIContext, credits: ContentBylineCredit[] | undefined): ApiByline[] {
	return (credits ?? []).map((credit) => ({
		name: credit.byline.displayName,
		// The media file route is keyed by storage key, not media id (an id 404s).
		avatarUrl: credit.byline.avatarStorageKey
			? mediaUrl(context, { storageKey: credit.byline.avatarStorageKey })
			: null,
		role: credit.roleLabel ?? null,
	}));
}

/** Term references; categories carry an icon key, tags never do. */
export const toTermRefs = (
	terms: TaxonomyTerm[] | undefined,
	taxonomy: "category" | "tag",
): ApiTermRef[] =>
	(terms ?? []).map((term) => ({
		slug: term.slug,
		label: term.label,
		icon: taxonomy === "category" ? getCategoryIcon(term.slug) : null,
	}));

// ── Portable Text ───────────────────────────────────────────────────────────

/**
 * Rewrites Portable Text for API clients: image blocks become
 * `{ _type: "image", url, alt, caption, width, height }` with an absolute URL,
 * and root-relative link `href`s become absolute. Walks nested values too, so
 * images inside columns, galleries or other containers are covered.
 */
export function toApiPortableText(
	context: APIContext,
	blocks: PortableTextBlock[] | undefined,
): ApiPortableTextBlock[] {
	if (!Array.isArray(blocks)) return [];
	return blocks.map((block) => normalizeNode(context, block) as ApiPortableTextBlock);
}

function normalizeNode(context: APIContext, node: unknown): unknown {
	if (Array.isArray(node)) return node.map((child) => normalizeNode(context, child));
	if (!node || typeof node !== "object") return node;

	const value = node as Record<string, unknown>;

	if (value._type === "image" && value.asset && typeof value.asset === "object") {
		const asset = value.asset as Record<string, unknown>;
		const meta = (asset.meta ?? {}) as Record<string, unknown>;
		const url = mediaUrl(context, {
			storageKey: asString(meta.storageKey),
			url: asString(asset.url),
			id: asString(asset._ref),
		});
		return {
			_type: "image",
			...(typeof value._key === "string" ? { _key: value._key } : {}),
			url: url ?? "",
			alt: asString(value.alt) ?? "",
			caption: asString(value.caption) ?? null,
			width: asDimension(value.width),
			height: asDimension(value.height),
		};
	}

	const out: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value)) {
		if (key === "href" && typeof child === "string") {
			out[key] = absoluteLink(child, publicOrigin(context));
		} else if (key === "url" && typeof child === "string" && value._type !== "span") {
			out[key] = absoluteLink(child, publicOrigin(context));
		} else {
			out[key] = normalizeNode(context, child);
		}
	}
	return out;
}

// ── Posts ───────────────────────────────────────────────────────────────────

type PostEntry = ContentEntry<{
	id: string;
	slug: string | null;
	status: string;
	title: string;
	excerpt?: string;
	featured_image?: unknown;
	content?: PortableTextBlock[];
	publishedAt: Date | null;
	updatedAt: Date;
	bylines?: ContentBylineCredit[];
	terms?: Record<string, TaxonomyTerm[]>;
}>;

/** Drafts, scheduled and archived entries are never public. */
export const isPublished = (entry: { data: { status: string } }) => entry.data.status === "published";

export const toIso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

export function toApiPostSummary(
	context: APIContext,
	post: PostEntry,
	terms?: { categories?: TaxonomyTerm[]; tags?: TaxonomyTerm[] },
): ApiPostSummary {
	return {
		slug: post.data.slug ?? post.id,
		title: post.data.title,
		excerpt: post.data.excerpt?.trim() || null,
		publishedAt: toIso(post.data.publishedAt),
		readingTime: getReadingTime(post.data.content),
		featuredImage: toApiImage(context, post.data.featured_image),
		bylines: toApiBylines(context, post.data.bylines),
		categories: toTermRefs(terms?.categories ?? post.data.terms?.category, "category"),
		tags: toTermRefs(terms?.tags ?? post.data.terms?.tag, "tag"),
	};
}

// ── Comments ────────────────────────────────────────────────────────────────

type PublicComment = GetCommentsResult["items"][number];

/**
 * EmDash's public comment shape → ApiComment. Only what the web shows
 * publicly: never the email, IP hash or moderation data (EmDash does not
 * expose them here either).
 */
export function toApiComment(comment: PublicComment): ApiComment {
	return {
		id: comment.id,
		authorName: comment.authorName,
		isMember: comment.isRegisteredUser,
		body: comment.body,
		createdAt: comment.createdAt,
		replies: (comment.replies ?? []).map(toApiComment),
	};
}
