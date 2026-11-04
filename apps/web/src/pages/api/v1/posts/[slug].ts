import type { ApiPost } from "@blog/shared";
import type { APIRoute } from "astro";
import { decodeSlug, getEmDashEntry } from "emdash";
import {
	handle,
	isPublished,
	jsonOk,
	notFound,
	toApiPortableText,
	toApiPostSummary,
} from "../../../../lib/public-api";

/** GET /api/v1/posts/[slug]: one published post with its Portable Text body. */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const slug = decodeSlug(context.params.slug);
		if (!slug) return notFound("Tulisan tidak ditemukan.");

		const { entry: post, error } = await getEmDashEntry("posts", slug);
		if (error) throw error;
		// getEmDashEntry can serve drafts in preview/edit mode; the API never does.
		if (!post || !isPublished(post)) return notFound("Tulisan tidak ditemukan.");

		const data: ApiPost = {
			...toApiPostSummary(context, post),
			updatedAt: post.data.updatedAt.toISOString(),
			content: toApiPortableText(context, post.data.content),
		};
		return jsonOk(data);
	});
