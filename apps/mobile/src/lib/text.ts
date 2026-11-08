/** Small, pure text helpers for names and user-written text. */

const WHITESPACE = /\s+/;

/** Up to two initials for an avatar fallback: "Siti Rahma Dewi" → "SR". */
export function initials(name: string): string {
	return name
		.split(WHITESPACE)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => [...word][0]?.toUpperCase() ?? "")
		.join("");
}

/** A run of plain text; `url` is set when the run is a bare http(s) link. */
export interface TextRun {
	text: string;
	url?: string;
}

// The rule EmDash's web comment list links with: http(s) up to whitespace or <>"')].
const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;
// Sentence punctuation right after a URL ends the sentence, not the URL.
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const HAS_HOST = /^https?:\/\/[^./]/;

/**
 * Splits plain text (a comment body) into text and link runs, so a client can
 * make bare URLs tappable without an HTML engine. Joining every run's `text`
 * gives the input back unchanged.
 */
export function splitLinks(text: string): TextRun[] {
	const runs: TextRun[] = [];
	let last = 0;
	for (const match of text.matchAll(URL_PATTERN)) {
		const url = match[0].replace(TRAILING_PUNCTUATION, "");
		if (!HAS_HOST.test(url)) continue;
		const start = match.index;
		if (start > last) runs.push({ text: text.slice(last, start) });
		runs.push({ text: url, url });
		last = start + url.length;
	}
	if (last < text.length) runs.push({ text: text.slice(last) });
	return runs;
}
