/** A run of snippet text; `highlight` is true for a matched search term. */
export interface SnippetSegment {
	text: string;
	highlight: boolean;
}

const MARK_PATTERN = /<mark>([\s\S]*?)<\/mark>/g;
const TAG_PATTERN = /<[^>]*>/g;
const ENTITY_PATTERN = /&(amp|lt|gt|quot|#39|#x27|apos);/g;
const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	"#39": "'",
	"#x27": "'",
	apos: "'",
};

function decode(html: string): string {
	return html.replace(TAG_PATTERN, "").replace(ENTITY_PATTERN, (_, name: string) => ENTITIES[name] ?? "");
}

/**
 * Splits a search snippet (escaped text with `<mark>` around matches, as
 * returned by `/api/v1/search`) into plain-text segments, so a client can
 * render highlights without an HTML engine.
 */
export function parseSnippet(html: string | null | undefined): SnippetSegment[] {
	if (!html) return [];
	const segments: SnippetSegment[] = [];
	let last = 0;
	for (const match of html.matchAll(MARK_PATTERN)) {
		const index = match.index ?? 0;
		if (index > last) segments.push({ text: decode(html.slice(last, index)), highlight: false });
		segments.push({ text: decode(match[1] ?? ""), highlight: true });
		last = index + match[0].length;
	}
	if (last < html.length) segments.push({ text: decode(html.slice(last)), highlight: false });
	return segments.filter((segment) => segment.text.length > 0);
}
