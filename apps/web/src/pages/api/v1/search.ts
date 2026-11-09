import type { ApiSearchResult } from "@blog/shared";
import type { APIRoute } from "astro";
import { search } from "emdash";
import { handle, jsonError, jsonPage, param, parseLimit } from "../../../lib/public-api";

const MAX_QUERY_LENGTH = 200;

/** GET /api/v1/search?q=&cursor=&limit=: full-text search over published posts and pages. */
export const GET: APIRoute = ({ url }) =>
	handle(async () => {
		const limit = parseLimit(url);
		if (limit === null) return jsonError("bad_request", "The limit parameter must be a number from 1 to 50.");

		const q = param(url, "q") ?? "";
		if (q.length > MAX_QUERY_LENGTH) {
			return jsonError("bad_request", `The query can be at most ${MAX_QUERY_LENGTH} characters.`);
		}
		if (!q) return jsonPage<ApiSearchResult>([], null);

		const { items, nextCursor } = await search(q, {
			collections: ["posts", "pages"],
			status: "published",
			limit,
			cursor: param(url, "cursor"),
		});

		const data: ApiSearchResult[] = items
			.filter((item) => item.slug && (item.collection === "posts" || item.collection === "pages"))
			.map((item) => ({
				collection: item.collection as ApiSearchResult["collection"],
				slug: item.slug as string,
				title: item.title ?? item.slug ?? "",
				snippet: item.snippet ?? null,
			}));
		return jsonPage(data, nextCursor);
	});
