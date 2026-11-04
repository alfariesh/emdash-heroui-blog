import {
	API_BASE_PATH,
	type ApiError,
	type ApiErrorCode,
	type ApiPage,
	type ApiPageEntry,
	type ApiPost,
	type ApiPostComments,
	type ApiPostSummary,
	type ApiSearchResult,
	type ApiSite,
	type ApiSuccess,
	type ApiTerm,
	type PostListQuery,
	type SearchQuery,
} from "./types";

/**
 * The parts of the Fetch API the client needs. Declared here because this
 * package compiles without DOM types; React Native, browsers and Node 18+ all
 * provide a compatible global `fetch`.
 */
interface FetchResponseLike {
	ok: boolean;
	status: number;
	json(): Promise<unknown>;
}
type FetchLike = (
	input: string,
	init?: { headers?: Record<string, string>; signal?: unknown },
) => Promise<FetchResponseLike>;

export interface RequestOptions {
	/** An AbortSignal, to cancel the request. */
	signal?: unknown;
}

/** Thrown for any non-2xx response or a body that is not a valid envelope. */
export class BlogApiError extends Error {
	readonly status: number;
	readonly code: ApiErrorCode | "network_error" | "invalid_response";

	constructor(status: number, code: BlogApiError["code"], message: string) {
		super(message);
		this.name = "BlogApiError";
		this.status = status;
		this.code = code;
	}
}

export interface BlogClient {
	/** Base URL the client was created with, without a trailing slash. */
	readonly baseUrl: string;
	getSite(options?: RequestOptions): Promise<ApiSite>;
	getPosts(query?: PostListQuery, options?: RequestOptions): Promise<ApiPage<ApiPostSummary>>;
	getPost(slug: string, options?: RequestOptions): Promise<ApiPost>;
	getPostComments(slug: string, options?: RequestOptions): Promise<ApiPostComments>;
	getPage(slug: string, options?: RequestOptions): Promise<ApiPageEntry>;
	getCategories(options?: RequestOptions): Promise<ApiTerm[]>;
	getTags(options?: RequestOptions): Promise<ApiTerm[]>;
	search(query: SearchQuery, options?: RequestOptions): Promise<ApiPage<ApiSearchResult>>;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === "") continue;
		parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
	}
	return parts.length > 0 ? `?${parts.join("&")}` : "";
}

function isApiError(body: unknown): body is ApiError {
	return (
		typeof body === "object" &&
		body !== null &&
		(body as { ok?: unknown }).ok === false &&
		typeof (body as { error?: unknown }).error === "object"
	);
}

function isOk(body: unknown): body is { ok: true } {
	return typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;
}

/**
 * Creates a client for the blog's public API.
 *
 * @param baseUrl Origin of apps/web, e.g. "http://localhost:4321" (no `/api/v1`).
 */
export function createBlogClient(baseUrl: string): BlogClient {
	const root = baseUrl.replace(/\/+$/, "");

	async function request<T>(path: string, options?: RequestOptions): Promise<T> {
		const fetchImpl = (globalThis as { fetch?: FetchLike }).fetch;
		if (!fetchImpl) {
			throw new BlogApiError(0, "network_error", "fetch tidak tersedia di lingkungan ini.");
		}

		let response: FetchResponseLike;
		try {
			response = await fetchImpl(`${root}${API_BASE_PATH}${path}`, {
				headers: { Accept: "application/json" },
				signal: options?.signal,
			});
		} catch (error) {
			if ((error as { name?: unknown })?.name === "AbortError") throw error;
			throw new BlogApiError(0, "network_error", "Tidak dapat terhubung ke server.");
		}

		let body: unknown;
		try {
			body = await response.json();
		} catch {
			throw new BlogApiError(response.status, "invalid_response", "Respons server tidak valid.");
		}

		if (isApiError(body)) {
			throw new BlogApiError(body.error.status, body.error.code, body.error.message);
		}
		if (!response.ok || !isOk(body)) {
			throw new BlogApiError(response.status, "invalid_response", "Respons server tidak valid.");
		}
		return body as T;
	}

	const data = async <T>(path: string, options?: RequestOptions) =>
		(await request<ApiSuccess<T>>(path, options)).data;

	return {
		baseUrl: root,
		getSite: (options) => data<ApiSite>("/site", options),
		getPosts: (query = {}, options) =>
			request<ApiPage<ApiPostSummary>>(
				`/posts${toQueryString({
					cursor: query.cursor,
					limit: query.limit,
					category: query.category,
					tag: query.tag,
				})}`,
				options,
			),
		getPost: (slug, options) => data<ApiPost>(`/posts/${encodeURIComponent(slug)}`, options),
		getPostComments: (slug, options) =>
			data<ApiPostComments>(`/posts/${encodeURIComponent(slug)}/comments`, options),
		getPage: (slug, options) => data<ApiPageEntry>(`/pages/${encodeURIComponent(slug)}`, options),
		getCategories: (options) => data<ApiTerm[]>("/categories", options),
		getTags: (options) => data<ApiTerm[]>("/tags", options),
		search: (query, options) =>
			request<ApiPage<ApiSearchResult>>(
				`/search${toQueryString({ q: query.q, cursor: query.cursor, limit: query.limit })}`,
				options,
			),
	};
}
