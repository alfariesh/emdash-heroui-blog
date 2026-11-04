import { getTermsForEntries } from "emdash";

export interface TermLink {
	slug: string;
	label: string;
}

export interface PostTerms {
	tags: TermLink[];
	/** First category of the post (posts usually have one). */
	category: TermLink | null;
}

const toLink = (term: { slug: string; label: string }): TermLink => ({
	slug: term.slug,
	label: term.label,
});

/**
 * Tags and category for a list of posts in two batched queries, instead of
 * one getEntryTerms() call per post. Pass `entry.data.id` (the ULID), not the slug.
 */
export async function getPostTerms(ids: string[]): Promise<(id: string) => PostTerms> {
	if (ids.length === 0) return () => ({ tags: [], category: null });
	const [tagsById, categoriesById] = await Promise.all([
		getTermsForEntries("posts", ids, "tag"),
		getTermsForEntries("posts", ids, "category"),
	]);
	return (id) => ({
		tags: (tagsById.get(id) ?? []).map(toLink),
		category: (categoriesById.get(id) ?? []).map(toLink)[0] ?? null,
	});
}
