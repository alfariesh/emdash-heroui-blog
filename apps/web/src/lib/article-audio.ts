/**
 * "Listen to this article": narration made by the article-audio plugin
 * (emdash-plugin-article-audio, registered in astro.config.mjs).
 *
 * The plugin keeps the audio and its word timings in its own storage and
 * serves them from a public route. Pages and /api/v1 call that route
 * in-process, then rewrite the audio URL onto the public origin like every
 * other URL in the API.
 */
import type { ApiAudioSummary, ApiPostAudio } from "@blog/shared";
import type { APIContext, AstroGlobal } from "astro";
import { isNarration, type Narration } from "emdash-plugin-article-audio/client";
import { absoluteUrl } from "./public-api";
import { publicOrigin } from "./site-url";

export const ARTICLE_AUDIO_PLUGIN_ID = "article-audio";

type Context = APIContext | AstroGlobal;

/** The narration of a published entry, or null (none yet, plugin disabled, or not published). */
export async function getNarration(context: Context, collection: string, contentId: string): Promise<Narration | null> {
	const handler = context.locals.emdash?.handlePublicPluginApiRoute;
	if (!handler) return null;
	const url = new URL(`/_emdash/api/plugins/${ARTICLE_AUDIO_PLUGIN_ID}/narration`, context.url);
	url.search = new URLSearchParams({ collection, id: contentId }).toString();
	try {
		const result = await handler(ARTICLE_AUDIO_PLUGIN_ID, "GET", "narration", new Request(url));
		return result.success && isNarration(result.data) ? result.data : null;
	} catch (error) {
		console.error("[article-audio]", error);
		return null;
	}
}

/** The narration's MP3 on the public origin (the plugin builds URLs from the request it was given). */
function audioUrl(narration: Narration, context: Context): string {
	const path = new URL(narration.audio.url, context.url).pathname;
	return absoluteUrl(path, publicOrigin(context));
}

const voiceLabel = (narration: Narration) =>
	[narration.voice.providerLabel, narration.voice.voiceName].filter(Boolean).join(" · ");

export function toApiAudioSummary(narration: Narration, context: Context): ApiAudioSummary {
	return { url: audioUrl(narration, context), durationMs: narration.audio.durationMs, voice: voiceLabel(narration) };
}

export function toApiPostAudio(narration: Narration, context: Context): ApiPostAudio {
	return {
		...toApiAudioSummary(narration, context),
		mimeType: narration.audio.mimeType,
		bytes: narration.audio.bytes,
		timing: narration.timing,
		generatedAt: narration.generatedAt,
		blocks: narration.blocks.map(({ key, kind, text, startMs, endMs, words }) => ({ key, kind, text, startMs, endMs, words })),
	};
}
