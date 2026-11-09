// Run with `pnpm --filter @blog/web test`: Node's built-in runner strips the types.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMessage, EXPO_PUSH_URL, readTickets, sendBatch, truncate, type PushContent } from "./expo.ts";

const content: PushContent = {
	title: "New post",
	body: "Summary",
	data: { url: "https://blog.example.com/posts/hello" },
	channelId: "new-posts",
};
const A = "ExponentPushToken[aaaaaaaaaaaa]";
const B = "ExponentPushToken[bbbbbbbbbbbb]";

test("truncate collapses whitespace and cuts at a word", () => {
	assert.equal(truncate("  One\n two   three ", 50), "One two three");
	assert.equal(truncate("Limits are not a barrier to creativity at all", 30), "Limits are not a barrier to…");
	assert.equal(truncate("Supercalifragilisticexpialidocious", 10), "Supercali…");
});

test("one message addresses the whole batch", () => {
	assert.deepEqual(buildMessage([A, B], content), { ...content, to: [A, B], priority: "default" });
});

test("tickets map to tokens by position; only DeviceNotRegistered is removed", () => {
	const body = {
		data: [
			{ status: "ok", id: "1" },
			{ status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
		],
	};
	assert.deepEqual(readTickets([A, B], body), { ok: 1, failed: 1, unregistered: [B], requestFailed: false });
	const other = { data: [{ status: "error", details: { error: "MessageRateExceeded" } }] };
	assert.deepEqual(readTickets([A], other), { ok: 0, failed: 1, unregistered: [], requestFailed: false });
	assert.deepEqual(readTickets([A, B], { errors: [{ code: "X" }] }), {
		ok: 0,
		failed: 2,
		unregistered: [],
		requestFailed: false,
	});
});

test("sendBatch posts JSON to Expo, with the access token when set", async () => {
	const calls: Array<{ url: string; init: { headers: Record<string, string>; body: string } }> = [];
	const fetchFn = async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
		calls.push({ url, init });
		return { ok: true, status: 200, json: async () => ({ data: [{ status: "ok" }] }) };
	};
	assert.deepEqual(await sendBatch(fetchFn, [A], content, "secret"), {
		ok: 1,
		failed: 0,
		unregistered: [],
		requestFailed: false,
	});
	assert.equal(calls[0]?.url, EXPO_PUSH_URL);
	assert.equal(calls[0]?.init.headers.Authorization, "Bearer secret");
	assert.deepEqual(JSON.parse(calls[0]?.init.body ?? ""), [buildMessage([A], content)]);

	await sendBatch(fetchFn, [A], content, null);
	assert.equal(calls[1]?.init.headers.Authorization, undefined);
});

test("a failed request removes nothing", async () => {
	const down = async () => ({ ok: false, status: 503, json: async () => ({}) });
	assert.deepEqual(await sendBatch(down, [A, B], content), {
		ok: 0,
		failed: 2,
		unregistered: [],
		requestFailed: true,
	});
	const offline = async () => {
		throw new Error("network");
	};
	assert.equal((await sendBatch(offline, [A], content)).requestFailed, true);
});
