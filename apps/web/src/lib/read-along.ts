/**
 * Read-along highlighting for ArticleAudio, with the CSS Custom Highlight
 * API: ranges are painted by `::highlight()` rules in global.css without
 * touching the article's DOM, so links, selection and the table of
 * contents keep working. Browsers without the API just play the audio.
 *
 * Narration blocks are matched to rendered elements by their text, in
 * order, so the page needs no extra markup and blocks the narration skips
 * (images, code, skipped paragraphs) are simply passed over.
 */
import type { ApiAudioBlock } from "@blog/shared";

const BLOCK_HIGHLIGHT = "article-audio-block";
const WORD_HIGHLIGHT = "article-audio-word";
const CANDIDATES = "p, h1, h2, h3, h4, h5, h6, li, blockquote";

export interface BlockTarget {
	element: Element;
	/** Text nodes of the element in order, with each node's offset in the element's text. */
	nodes: Array<{ node: Text; start: number }>;
	/** `[start, end]` character offsets of each word (whitespace-separated token). */
	words: Array<[number, number]>;
	length: number;
}

export const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** Character ranges of the whitespace-separated words of `text`. */
export function wordOffsets(text: string): Array<[number, number]> {
	return Array.from(text.matchAll(/\S+/g), (match) => [match.index, match.index + match[0].length]);
}

export function highlightsSupported(): boolean {
	return typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
}

function target(element: Element): BlockTarget {
	const nodes: BlockTarget["nodes"] = [];
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	let text = "";
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		nodes.push({ node: node as Text, start: text.length });
		text += (node as Text).data;
	}
	return { element, nodes, words: wordOffsets(text), length: text.length };
}

/** The rendered element of each narration block, or null when it is not on the page. */
export function findBlockElements(blocks: readonly ApiAudioBlock[], root: Element, title: Element | null): Array<BlockTarget | null> {
	const candidates = Array.from(root.querySelectorAll(CANDIDATES));
	let cursor = 0;
	return blocks.map((block) => {
		const wanted = normalize(block.text);
		if (block.key === "title") return title && normalize(title.textContent ?? "") === wanted ? target(title) : null;
		for (let i = cursor; i < candidates.length; i++) {
			if (normalize(candidates[i].textContent ?? "") === wanted) {
				cursor = i + 1;
				return target(candidates[i]);
			}
		}
		return null;
	});
}

/** The DOM position of a character offset in the element's text. */
function point(target: BlockTarget, offset: number): [Text, number] | null {
	for (let i = target.nodes.length - 1; i >= 0; i--) {
		const { node, start } = target.nodes[i];
		if (offset >= start) return [node, Math.min(offset - start, node.data.length)];
	}
	return null;
}

function range(target: BlockTarget, start: number, end: number): Range | null {
	const from = point(target, start);
	const to = point(target, end);
	if (!from || !to) return null;
	const result = document.createRange();
	result.setStart(from[0], from[1]);
	result.setEnd(to[0], to[1]);
	return result;
}

/** Paints the block, and the word at `word` (-1 for none). */
export function setHighlights(target: BlockTarget, word: number) {
	if (!highlightsSupported()) return;
	const block = range(target, 0, target.length);
	if (block) CSS.highlights.set(BLOCK_HIGHLIGHT, new Highlight(block));
	const offsets = word >= 0 ? target.words[word] : undefined;
	const wordRange = offsets ? range(target, offsets[0], offsets[1]) : null;
	if (wordRange) CSS.highlights.set(WORD_HIGHLIGHT, new Highlight(wordRange));
	else CSS.highlights.delete(WORD_HIGHLIGHT);
}

export function clearHighlights() {
	if (!highlightsSupported()) return;
	CSS.highlights.delete(BLOCK_HIGHLIGHT);
	CSS.highlights.delete(WORD_HIGHLIGHT);
}
