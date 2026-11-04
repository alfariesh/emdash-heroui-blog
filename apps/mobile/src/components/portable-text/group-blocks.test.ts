/// <reference types="node" />
// Run with `pnpm --filter @blog/mobile test`: Node's built-in runner strips the types.
import type { ApiPortableTextBlock } from "@blog/shared";
import assert from "node:assert/strict";
import { test } from "node:test";
import { groupBlocks, type ListNode } from "./group-blocks.ts";

const text = (key: string, extra: Record<string, unknown> = {}): ApiPortableTextBlock => ({
	_type: "block",
	_key: key,
	style: "normal",
	children: [{ _type: "span", text: key }],
	...extra,
});
const item = (key: string, listItem: "bullet" | "number", level = 1) => text(key, { listItem, level });
const keysOf = (list: ListNode) => list.items.map((entry) => entry.block?._key ?? null);

test("plain blocks pass through in order", () => {
	const nodes = groupBlocks([text("a"), { _type: "image", _key: "img", url: "u" }, text("b")]);
	assert.deepEqual(
		nodes.map((node) => [node.kind, node.key]),
		[
			["text", "a"],
			["object", "img"],
			["text", "b"],
		],
	);
});

test("consecutive items of one type form one list", () => {
	const [list, after] = groupBlocks([item("1", "bullet"), item("2", "bullet"), text("p")]);
	assert.equal(list?.kind, "list");
	assert.deepEqual(keysOf(list as ListNode), ["1", "2"]);
	assert.equal(after?.kind, "text");
});

test("a change of list type starts a new list", () => {
	const nodes = groupBlocks([item("1", "bullet"), item("2", "number")]);
	assert.equal(nodes.length, 2);
	assert.deepEqual(
		nodes.map((node) => (node as ListNode).type),
		["bullet", "number"],
	);
});

test("deeper levels nest under the previous item", () => {
	const [list] = groupBlocks([item("1", "number"), item("1.1", "bullet", 2), item("1.2", "bullet", 2), item("2", "number")]);
	const top = list as ListNode;
	assert.deepEqual(keysOf(top), ["1", "2"]);
	const nested = top.items[0]?.children[0];
	assert.ok(nested);
	assert.equal(nested.type, "bullet");
	assert.deepEqual(keysOf(nested), ["1.1", "1.2"]);
});

test("a skipped level gets a placeholder host item", () => {
	const [list] = groupBlocks([item("deep", "bullet", 2)]);
	const top = list as ListNode;
	assert.equal(top.items[0]?.block, null);
	assert.deepEqual(keysOf(top.items[0]?.children[0] as ListNode), ["deep"]);
});
