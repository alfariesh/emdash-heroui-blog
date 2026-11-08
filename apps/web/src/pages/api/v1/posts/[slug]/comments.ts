import type { ApiPostComments } from "@blog/shared";
import type { APIRoute } from "astro";
import { decodeSlug, getCollectionInfo, getComments, getEmDashEntry } from "emdash";
import { handle, isPublished, jsonOk, notFound, toApiComment } from "../../../../../lib/public-api";

/**
 * GET /api/v1/posts/[slug]/comments: approved comments on a published post,
 * threaded like the web's comment list. Read-only: submitting a comment stays
 * on the web form (EmDash's public POST endpoint, with its spam checks).
 */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const slug = decodeSlug(context.params.slug);
		if (!slug) return notFound("Tulisan tidak ditemukan.");

		// Comments are keyed by the post's database id, and a draft's comments are never public.
		const { entry: post, error } = await getEmDashEntry("posts", slug);
		if (error) throw error;
		if (!post || !isPublished(post)) return notFound("Tulisan tidak ditemukan.");

		// getComments() does not check the collection setting; the web's <Comments> does, so match it.
		const collection = await getCollectionInfo("posts");
		if (!collection?.commentsEnabled) {
			return jsonOk<ApiPostComments>({ enabled: false, total: 0, comments: [] });
		}

		const { items, total } = await getComments({
			collection: "posts",
			contentId: post.data.id,
			threaded: true,
		});
		return jsonOk<ApiPostComments>({ enabled: true, total, comments: items.map(toApiComment) });
	});
