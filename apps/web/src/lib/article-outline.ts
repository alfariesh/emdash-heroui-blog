/** One h2/h3 of the article body. */
export interface OutlineSection {
	id: string;
	title: string;
	nested: boolean;
}

export interface ArticleOutline {
	sections: OutlineSection[];
	/** Section being read; null before the first heading is reached. */
	activeId: string | null;
}

const EMPTY_OUTLINE: ArticleOutline = { sections: [], activeId: null };

let outline = EMPTY_OUTLINE;
const listeners = new Set<() => void>();

function update(next: ArticleOutline) {
	outline = next;
	for (const listener of listeners) listener();
}

/** Lets the article page's script, which reads the DOM, feed the header island. */
export function publishSections(sections: OutlineSection[]) {
	update({ ...outline, sections });
}

export function publishActiveSection(activeId: string | null) {
	if (activeId !== outline.activeId) update({ ...outline, activeId });
}

export function subscribeOutline(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export const getOutline = () => outline;
export const getEmptyOutline = () => EMPTY_OUTLINE;
