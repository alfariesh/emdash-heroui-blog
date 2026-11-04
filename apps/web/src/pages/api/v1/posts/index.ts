import type { ApiPostSummary } from "@blog/shared";
import type { APIRoute } from "astro";
import { getEmDashCollection, getTaxonomyTerms, getTermsForEntries, type TaxonomyTerm } from "emdash";
import {
	handle,
	isPublished,
	jsonError,
	jsonPage,
	notFound,
	param,
	parseLimit,
	toApiPostSummary,
} from "../../../../lib/public-api";

/** True when `slug` is a term of `taxonomy` (searching nested terms too). */
async function termExists(taxonomy: "category" | "tag", slug: string): Promise<boolean> {
	const terms = await getTaxonomyTerms(taxonomy, { includeCounts: false });
	const walk = (list: TaxonomyTerm[]): boolean =>
		list.some((term) => term.slug === slug || walk(term.children ?? []));
	return walk(terms);
}

/**
 * GET /api/v1/posts?cursor=&limit=&category=&tag=
 * Published posts, newest first, with cursor pagination.
 */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const { url } = context;
		const limit = parseLimit(url);
		if (limit === null) return jsonError("bad_request", "Parameter limit harus angka 1–50.");

		const cursor = param(url, "cursor");
		const category = param(url, "category");
		const tag = param(url, "tag");

		const [categoryOk, tagOk] = await Promise.all([
			category ? termExists("category", category) : true,
			tag ? termExists("tag", tag) : true,
		]);
		if (!categoryOk) return notFound("Kategori tidak ditemukan.");
		if (!tagOk) return notFound("Tag tidak ditemukan.");

		const where: Record<string, string> = {};
		if (category) where.category = category;
		if (tag) where.tag = tag;

		const { entries, nextCursor, error } = await getEmDashCollection("posts", {
			status: "published",
			orderBy: { published_at: "desc" },
			limit,
			cursor,
			...(Object.keys(where).length > 0 ? { where } : {}),
		});
		if (error) throw error;

		const posts = entries.filter(isPublished);
		const ids = posts.map((post) => post.data.id);
		const [categoriesById, tagsById] = await Promise.all([
			getTermsForEntries("posts", ids, "category"),
			getTermsForEntries("posts", ids, "tag"),
		]);

		const data: ApiPostSummary[] = posts.map((post) =>
			toApiPostSummary(context, post, {
				categories: categoriesById.get(post.data.id) ?? [],
				tags: tagsById.get(post.data.id) ?? [],
			}),
		);
		return jsonPage(data, nextCursor);
	});
