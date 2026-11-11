import type { APIRoute } from "astro";
import { decodeSlug, getEmDashEntry } from "emdash";
import { getNarration, toApiPostAudio } from "../../../../../lib/article-audio";
import { handle, isPublished, jsonOk, notFound } from "../../../../../lib/public-api";

/**
 * GET /api/v1/posts/[slug]/audio: "listen to this article" narration with
 * read-along timings (article-audio plugin). 404 when the post has no audio.
 */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const slug = decodeSlug(context.params.slug);
		if (!slug) return notFound("Post not found.");

		const { entry: post, error } = await getEmDashEntry("posts", slug);
		if (error) throw error;
		if (!post || !isPublished(post)) return notFound("Post not found.");

		const narration = await getNarration(context, "posts", post.data.id);
		if (!narration) return notFound("This post has no audio.");
		return jsonOk(toApiPostAudio(narration, context));
	});
