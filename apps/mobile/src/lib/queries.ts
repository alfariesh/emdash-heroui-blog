/**
 * Query definitions for every API resource, built with `queryOptions` /
 * `infiniteQueryOptions` so screens, prefetching and cache reads share one
 * typed key + fetcher. Keys are hierarchical: invalidating ["posts"] covers
 * every list and detail.
 */
import type { ApiAdPlacement, ApiPage, ApiPostSummary, ApiSearchResult } from "@blog/shared";
import {
	infiniteQueryOptions,
	queryOptions,
	type InfiniteData,
	type QueryClient,
} from "@tanstack/react-query";
import { adRefreshDelay, createAdSnapshot, MAX_AD_LEASE_MS } from "./ad-snapshot";
import { api } from "./api";

const MINUTE = 60_000;

export const POSTS_PAGE_SIZE = 10;
export const SEARCH_MIN_LENGTH = 2;

/** Optional banners refresh at schedule boundaries and fail quietly without retries. */
export const adQuery = (placement: ApiAdPlacement) =>
	queryOptions({
		queryKey: ["ads", placement],
		queryFn: async ({ signal }) => {
			const requestedAt = Date.now();
			const slot = await api.getAd(placement, { signal });
			return createAdSnapshot(slot, requestedAt, Date.now());
		},
		staleTime: 0,
		gcTime: 0,
		retry: false,
		refetchInterval: (query) =>
			query.state.status === "error"
				? MAX_AD_LEASE_MS
				: adRefreshDelay(query.state.data, Date.now()),
	});

export interface PostFilter {
	category?: string;
	tag?: string;
}

export const siteQuery = () =>
	queryOptions({
		queryKey: ["site"],
		queryFn: ({ signal }) => api.getSite({ signal }),
		staleTime: 10 * MINUTE,
	});

export const postsQuery = (filter: PostFilter = {}) =>
	infiniteQueryOptions({
		queryKey: ["posts", "list", filter],
		queryFn: ({ pageParam, signal }) =>
			api.getPosts({ ...filter, cursor: pageParam, limit: POSTS_PAGE_SIZE }, { signal }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

export const postQuery = (slug: string) =>
	queryOptions({
		queryKey: ["posts", "detail", slug],
		queryFn: ({ signal }) => api.getPost(slug, { signal }),
	});

/** Approved comments on a post. Same freshness as the post (the API's max-age). */
export const postCommentsQuery = (slug: string) =>
	queryOptions({
		queryKey: ["posts", "comments", slug],
		queryFn: ({ signal }) => api.getPostComments(slug, { signal }),
	});

export const pageQuery = (slug: string) =>
	queryOptions({
		queryKey: ["pages", slug],
		queryFn: ({ signal }) => api.getPage(slug, { signal }),
		staleTime: 10 * MINUTE,
	});

export const categoriesQuery = () =>
	queryOptions({
		queryKey: ["terms", "category"],
		queryFn: ({ signal }) => api.getCategories({ signal }),
		staleTime: 5 * MINUTE,
	});

export const tagsQuery = () =>
	queryOptions({
		queryKey: ["terms", "tag"],
		queryFn: ({ signal }) => api.getTags({ signal }),
		staleTime: 5 * MINUTE,
	});

export const searchQuery = (q: string) =>
	infiniteQueryOptions({
		queryKey: ["search", q],
		queryFn: ({ pageParam, signal }) =>
			api.search({ q, cursor: pageParam, limit: POSTS_PAGE_SIZE }, { signal }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		enabled: q.length >= SEARCH_MIN_LENGTH,
		staleTime: 5 * MINUTE,
	});

/** Flattens the pages of an infinite list query. */
export function flattenPages<T>(data: InfiniteData<ApiPage<T>> | undefined): T[] {
	return data?.pages.flatMap((page) => page.data) ?? [];
}

export type SearchResults = InfiniteData<ApiPage<ApiSearchResult>>;

/**
 * A post summary already in any cached list, so the detail screen can paint
 * the title, image and byline while the full post loads.
 */
export function findCachedSummary(client: QueryClient, slug: string): ApiPostSummary | undefined {
	const lists = client.getQueriesData<InfiniteData<ApiPage<ApiPostSummary>>>({
		queryKey: ["posts", "list"],
	});
	for (const [, data] of lists) {
		for (const page of data?.pages ?? []) {
			const match = page.data.find((post) => post.slug === slug);
			if (match) return match;
		}
	}
	return undefined;
}

/** Warms the detail query (e.g. on press-in) so navigation opens on loaded content. */
export function prefetchPost(client: QueryClient, slug: string): void {
	void client.prefetchQuery(postQuery(slug));
}
