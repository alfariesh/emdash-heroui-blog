/**
 * Contract for the public, read-only JSON API served by apps/web under
 * `/api/v1`. Both the endpoints (apps/web) and the clients (apps/mobile)
 * use these types, so a change here is a change to the API.
 *
 * Rules the server guarantees:
 * - Only published content is returned; drafts are always 404.
 * - Every URL in a response (images, avatars, logo, menu items, links inside
 *   Portable Text) is absolute, built from the request origin.
 * - Dates are ISO 8601 strings.
 */

/** Version prefix of every endpoint path. */
export const API_BASE_PATH = "/api/v1";

// ── Envelope ────────────────────────────────────────────────────────────────

export interface ApiErrorBody {
	/** HTTP status code, repeated in the body for clients that lose it. */
	status: number;
	/** Machine-readable code, e.g. "not_found", "bad_request". */
	code: ApiErrorCode;
	/** Human-readable message (Indonesian, safe to show to visitors). */
	message: string;
}

export type ApiErrorCode = "not_found" | "bad_request" | "internal_error";

/** Every error response: `{ ok: false, error: {...} }`. */
export interface ApiError {
	ok: false;
	error: ApiErrorBody;
}

/** Every single-resource response: `{ ok: true, data: T }`. */
export interface ApiSuccess<T> {
	ok: true;
	data: T;
}

/** Every list response: `{ ok: true, data: T[], nextCursor }`. */
export interface ApiPage<T> {
	ok: true;
	data: T[];
	/** Opaque cursor for the next page, or null when this is the last page. */
	nextCursor: string | null;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export type ApiPageResponse<T> = ApiPage<T> | ApiError;

// ── Shared pieces ───────────────────────────────────────────────────────────

export interface ApiImage {
	/** Absolute URL. */
	url: string;
	alt: string;
	width: number | null;
	height: number | null;
}

export interface ApiByline {
	name: string;
	/** Absolute URL, or null when the byline has no avatar. */
	avatarUrl: string | null;
	/** Role label such as "Kontributor tamu", or null for a plain author credit. */
	role: string | null;
}

export interface ApiTermRef {
	slug: string;
	label: string;
	/**
	 * Icon key for categories (one of CATEGORY_ICON_KEYS, see
	 * category-icons.ts); always null for tags. Typed as string so an older app
	 * build that receives a newer key can fall back to DEFAULT_CATEGORY_ICON.
	 */
	icon: string | null;
}

export interface ApiTerm extends ApiTermRef {
	description: string | null;
	/** Number of published posts with this term. */
	count: number;
}

// ── Portable Text ───────────────────────────────────────────────────────────

export interface ApiPortableTextSpan {
	_type: "span";
	_key?: string;
	text: string;
	/** Decorators ("strong", "em", "code", ...) or `_key`s of `markDefs`. */
	marks?: string[];
}

export interface ApiPortableTextMarkDef {
	_type: string;
	_key: string;
	/** For `_type: "link"`: absolute URL. */
	href?: string;
	blank?: boolean;
	[key: string]: unknown;
}

export interface ApiPortableTextTextBlock {
	_type: "block";
	_key?: string;
	/** "normal", "h1"…"h6", "blockquote". */
	style?: string;
	/** "bullet" or "number" for list items. */
	listItem?: string;
	/** Nesting level for list items, starting at 1. */
	level?: number;
	children: ApiPortableTextSpan[];
	markDefs?: ApiPortableTextMarkDef[];
}

/** Image block, normalised by the server: no asset refs, absolute `url`. */
export interface ApiPortableTextImageBlock {
	_type: "image";
	_key?: string;
	url: string;
	alt: string;
	caption: string | null;
	width: number | null;
	height: number | null;
}

/** Any other block type (code, embed, …). Clients may skip unknown types. */
export interface ApiPortableTextUnknownBlock {
	_type: string;
	_key?: string;
	[key: string]: unknown;
}

export type ApiPortableTextBlock =
	| ApiPortableTextTextBlock
	| ApiPortableTextImageBlock
	| ApiPortableTextUnknownBlock;

// ── Resources ───────────────────────────────────────────────────────────────

export interface ApiMenuItem {
	label: string;
	/** Absolute URL. */
	url: string;
	/** "_blank" etc., or null. */
	target: string | null;
	children: ApiMenuItem[];
}

/** GET /api/v1/site */
export interface ApiSite {
	title: string;
	tagline: string;
	logo: ApiImage | null;
	/** BCP 47 locale for visitor-facing text and dates. */
	locale: string;
	/** Origin the response was built for, e.g. "http://10.0.2.2:4321". */
	url: string;
	/** Items of the `primary` menu. */
	menu: ApiMenuItem[];
}

/** Item of GET /api/v1/posts */
export interface ApiPostSummary {
	slug: string;
	title: string;
	excerpt: string | null;
	/** ISO 8601. */
	publishedAt: string | null;
	/** Minutes, at least 1. */
	readingTime: number;
	featuredImage: ApiImage | null;
	bylines: ApiByline[];
	categories: ApiTermRef[];
	tags: ApiTermRef[];
}

/** GET /api/v1/posts/[slug] */
export interface ApiPost extends ApiPostSummary {
	/** ISO 8601. */
	updatedAt: string;
	content: ApiPortableTextBlock[];
}

/** GET /api/v1/pages/[slug] */
export interface ApiPageEntry {
	slug: string;
	title: string;
	/** ISO 8601. */
	publishedAt: string | null;
	/** ISO 8601. */
	updatedAt: string;
	content: ApiPortableTextBlock[];
}

/** Item of GET /api/v1/search */
export interface ApiSearchResult {
	collection: "posts" | "pages";
	slug: string;
	title: string;
	/**
	 * Match context as sanitized HTML: text is escaped and the only tags are
	 * `<mark>…</mark>` around matched terms. Use `parseSnippet()` to render it
	 * without an HTML engine.
	 */
	snippet: string | null;
}

// ── Query parameters ────────────────────────────────────────────────────────

export interface PostListQuery {
	cursor?: string;
	/** 1–50, default 10. */
	limit?: number;
	/** Category slug. */
	category?: string;
	/** Tag slug. */
	tag?: string;
}

export interface SearchQuery {
	q: string;
	cursor?: string;
	/** 1–50, default 10. */
	limit?: number;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
