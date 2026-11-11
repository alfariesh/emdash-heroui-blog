import type { ApiPost } from "@blog/shared";
import type { APIRoute } from "astro";
import { decodeSlug, getEmDashEntry } from "emdash";
import { getNarration, toApiAudioSummary } from "../../../../lib/article-audio";
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
		if (!slug) return notFound("Post not found.");

		const { entry: post, error } = await getEmDashEntry("posts", slug);
		if (error) throw error;
		// getEmDashEntry can serve drafts in preview/edit mode; the API never does.
		if (!post || !isPublished(post)) return notFound("Post not found.");

		const narration = await getNarration(context, "posts", post.data.id);
		const data: ApiPost = {
			...toApiPostSummary(context, post),
			updatedAt: post.data.updatedAt.toISOString(),
			content: toApiPortableText(context, post.data.content),
			audio: narration ? toApiAudioSummary(narration, context) : null,
		};
		return jsonOk(data);
	});
