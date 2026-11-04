import { getCategoryIcon, type ApiTerm } from "@blog/shared";
import { getTaxonomyTerms, type TaxonomyTerm } from "emdash";

/** All terms of a taxonomy, flattened depth-first, with published-post counts. */
export async function listTerms(taxonomy: "category" | "tag"): Promise<ApiTerm[]> {
	const terms = await getTaxonomyTerms(taxonomy);
	const out: ApiTerm[] = [];
	const walk = (list: TaxonomyTerm[]) => {
		for (const term of list) {
			out.push({
				slug: term.slug,
				label: term.label,
				icon: taxonomy === "category" ? getCategoryIcon(term.slug) : null,
				description: term.description?.trim() || null,
				count: term.count ?? 0,
			});
			walk(term.children ?? []);
		}
	};
	walk(terms);
	return out;
}
