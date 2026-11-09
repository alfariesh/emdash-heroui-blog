import {
	API_BASE_PATH,
	type ApiAdPlacement,
	type ApiAdSlot,
	type ApiDeviceRegistration,
	type ApiDeviceStatus,
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
	init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: unknown },
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
	getAd(placement: ApiAdPlacement, options?: RequestOptions): Promise<ApiAdSlot>;
	getPosts(query?: PostListQuery, options?: RequestOptions): Promise<ApiPage<ApiPostSummary>>;
	getPost(slug: string, options?: RequestOptions): Promise<ApiPost>;
	getPostComments(slug: string, options?: RequestOptions): Promise<ApiPostComments>;
	getPage(slug: string, options?: RequestOptions): Promise<ApiPageEntry>;
	getCategories(options?: RequestOptions): Promise<ApiTerm[]>;
	getTags(options?: RequestOptions): Promise<ApiTerm[]>;
	search(query: SearchQuery, options?: RequestOptions): Promise<ApiPage<ApiSearchResult>>;
	/** Subscribes a device to new-post notifications (idempotent: re-registering refreshes it). */
	registerDevice(device: ApiDeviceRegistration, options?: RequestOptions): Promise<ApiDeviceStatus>;
	/** Unsubscribes a device; succeeds even when the token was not registered. */
	unregisterDevice(token: string, options?: RequestOptions): Promise<ApiDeviceStatus>;
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

	async function request<T>(
		path: string,
		options?: RequestOptions & { method?: "POST" | "DELETE"; body?: unknown },
	): Promise<T> {
		const fetchImpl = (globalThis as { fetch?: FetchLike }).fetch;
		if (!fetchImpl) {
			throw new BlogApiError(0, "network_error", "fetch tidak tersedia di lingkungan ini.");
		}

		let response: FetchResponseLike;
		try {
			const hasBody = options?.body !== undefined;
			response = await fetchImpl(`${root}${API_BASE_PATH}${path}`, {
				method: options?.method ?? "GET",
				headers: hasBody
					? { Accept: "application/json", "Content-Type": "application/json" }
					: { Accept: "application/json" },
				body: hasBody ? JSON.stringify(options.body) : undefined,
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

	const data = async <T>(path: string, options?: Parameters<typeof request>[1]) =>
		(await request<ApiSuccess<T>>(path, options)).data;

	return {
		baseUrl: root,
		getSite: (options) => data<ApiSite>("/site", options),
		getAd: (placement, options) =>
			data<ApiAdSlot>(`/ads${toQueryString({ placement })}`, options),
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
		registerDevice: (device, options) =>
			data<ApiDeviceStatus>("/devices", { ...options, method: "POST", body: device }),
		unregisterDevice: (token, options) =>
			data<ApiDeviceStatus>(`/devices/${encodeURIComponent(token)}`, { ...options, method: "DELETE" }),
	};
}
