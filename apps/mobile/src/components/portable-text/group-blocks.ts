/**
 * Portable Text stores list items as flat blocks with `listItem` + `level`.
 * Rendering needs them as nested lists, so this pass groups them (the same
 * job as @portabletext/toolkit's nestLists, without the dependency).
 */
import type { ApiPortableTextBlock, ApiPortableTextTextBlock } from "@blog/shared";

export type ListType = "bullet" | "number";

export interface ListNode {
	kind: "list";
	key: string;
	type: ListType;
	items: ListItemNode[];
}

export interface ListItemNode {
	/** Null for a placeholder item that only hosts a deeper list (a skipped level). */
	block: ApiPortableTextTextBlock | null;
	children: ListNode[];
}

export type RenderNode =
	| { kind: "text"; key: string; block: ApiPortableTextTextBlock }
	| { kind: "object"; key: string; block: ApiPortableTextBlock }
	| ListNode;

export function isTextBlock(block: ApiPortableTextBlock): block is ApiPortableTextTextBlock {
	return block._type === "block" && Array.isArray((block as { children?: unknown }).children);
}

export function groupBlocks(blocks: readonly ApiPortableTextBlock[]): RenderNode[] {
	const nodes: RenderNode[] = [];
	// Open lists, index = level - 1.
	let open: ListNode[] = [];

	blocks.forEach((block, index) => {
		const key = block._key ?? `b${index}`;

		if (!isTextBlock(block) || !block.listItem) {
			open = [];
			nodes.push(isTextBlock(block) ? { kind: "text", key, block } : { kind: "object", key, block });
			return;
		}

		const level = Math.max(1, block.level ?? 1);
		const type: ListType = block.listItem === "number" ? "number" : "bullet";

		// Close lists deeper than this item, and a list of the other type at its level.
		open = open.slice(0, level);
		if (open.length === level && open[level - 1]?.type !== type) open = open.slice(0, level - 1);

		while (open.length < level) {
			const list: ListNode = { kind: "list", key: `${key}-l${open.length + 1}`, type, items: [] };
			const parent = open.at(-1);
			if (parent) {
				let host = parent.items.at(-1);
				if (!host) {
					host = { block: null, children: [] };
					parent.items.push(host);
				}
				host.children.push(list);
			} else {
				nodes.push(list);
			}
			open.push(list);
		}

		open[level - 1]?.items.push({ block, children: [] });
	});

	return nodes;
}
