import type { ApiPageEntry } from "@blog/shared";
import type { APIRoute } from "astro";
import { decodeSlug, getEmDashEntry } from "emdash";
import { handle, isPublished, jsonOk, notFound, toApiPortableText, toIso } from "../../../../lib/public-api";

/** GET /api/v1/pages/[slug]: one published static page (e.g. "about"). */
export const GET: APIRoute = (context) =>
	handle(async () => {
		const slug = decodeSlug(context.params.slug);
		if (!slug) return notFound("Page not found.");

		const { entry: page, error } = await getEmDashEntry("pages", slug);
		if (error) throw error;
		if (!page || !isPublished(page)) return notFound("Page not found.");

		const data: ApiPageEntry = {
			slug: page.data.slug ?? page.id,
			title: page.data.title,
			publishedAt: toIso(page.data.publishedAt),
			updatedAt: page.data.updatedAt.toISOString(),
			content: toApiPortableText(context, page.data.content),
		};
		return jsonOk(data);
	});
