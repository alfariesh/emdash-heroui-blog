import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createCollectionBody, createFieldBody } from "emdash/api/schemas";

const script = new URL("./setup-ads.mjs", import.meta.url);
const seed = JSON.parse(await readFile(new URL("../seed/seed.json", import.meta.url), "utf8"));
const definition = seed.collections.find((collection) => collection.slug === "ads");
const existingFields = () => definition.fields.map((field, sortOrder) => ({
	...structuredClone(field),
	required: field.required ?? false,
	validation: field.validation ?? null,
	sortOrder,
}));

async function fixture(t, fields) {
	const state = {
		collection: fields ? { ...definition, fields: undefined } : undefined,
		fields: fields ?? [],
		writes: [],
		failField: undefined,
	};
	const server = createServer(async (req, res) => {
		const path = new URL(req.url, "http://localhost").pathname;
		const send = (data, status = 200) => {
			res.writeHead(status, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ success: status < 400, data }));
		};
		if (path.endsWith("/auth/dev-bypass")) {
			res.setHeader("Set-Cookie", "emdash_session=setup-test; Path=/");
			return send({ success: true });
		}
		if (req.method === "GET") {
			if (path.endsWith("/schema/collections")) return send({ items: state.collection ? [state.collection] : [] });
			if (path.endsWith("/schema/collections/ads")) return send({ item: { ...state.collection, fields: state.fields } });
		}
		let raw = "";
		for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw || "{}");
		state.writes.push({ path, body });
		if (path.endsWith("/schema/collections")) {
			const parsed = createCollectionBody.safeParse(body);
			if (!parsed.success) return send({ error: parsed.error.message }, 400);
			state.collection = parsed.data;
			return send({ item: body }, 201);
		}
		if (path.endsWith("/schema/collections/ads/fields")) {
			if (state.failField === body.slug) return send({ error: "Field creation failed" }, 400);
			const parsed = createFieldBody.safeParse(body);
			if (!parsed.success) return send({ error: parsed.error.message }, 400);
			state.fields.push(parsed.data);
			return send({ item: body }, 201);
		}
		send({ error: "Unexpected request" }, 404);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(() => new Promise((resolve) => server.close(resolve)));
	return { state, url: `http://127.0.0.1:${server.address().port}` };
}

function run(url, token = "") {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [fileURLToPath(script), "--url", url], {
			env: { ...process.env, EMDASH_TOKEN: token },
			timeout: 10_000,
		});
		let output = "";
		child.stdout.on("data", (data) => { output += data; });
		child.stderr.on("data", (data) => { output += data; });
		child.on("error", reject);
		child.on("close", (code) => resolve({ code, output }));
	});
}

test("setup adds the complete seed schema to an existing site and reruns without writes", async (t) => {
	const { state, url } = await fixture(t);
	const first = await run(url);
	assert.equal(first.code, 0, first.output);
	assert.equal(state.collection.routable, false);
	assert.deepEqual(state.collection.supports, ["drafts", "revisions"]);
	assert.equal(state.fields.length, definition.fields.length);
	for (const field of definition.fields) {
		const current = state.fields.find((item) => item.slug === field.slug);
		assert.equal(current.type, field.type);
		assert.deepEqual(current.defaultValue, field.defaultValue);
		assert.deepEqual(current.validation, field.validation ?? null);
	}
	const writes = state.writes.length;
	const second = await run(url);
	assert.equal(second.code, 0, second.output);
	assert.equal(state.writes.length, writes);
});

test("setup resumes a failed field creation without deleting or duplicating fields", async (t) => {
	const { state, url } = await fixture(t);
	state.failField = "placement";
	assert.notEqual((await run(url)).code, 0);
	assert.equal(state.fields.length, 3);
	state.failField = undefined;
	const retry = await run(url);
	assert.equal(retry.code, 0, retry.output);
	assert.deepEqual(state.fields.map((field) => field.slug), definition.fields.map((field) => field.slug));
	assert.equal(state.writes.filter((write) => write.path.endsWith("/collections")).length, 1);
});

test("setup refuses incompatible fields before adding any missing ones", async (t) => {
	const fields = existingFields().filter((field) => field.slug !== "priority");
	fields[0].type = "number";
	const { state, url } = await fixture(t, fields);
	assert.notEqual((await run(url)).code, 0);
	assert.equal(state.writes.length, 0);
});

test("setup refuses a placement selector missing a supported position", async (t) => {
	const fields = existingFields();
	fields.find((field) => field.slug === "placement").validation = { options: ["Home"] };
	const { state, url } = await fixture(t, fields);
	const result = await run(url);
	assert.notEqual(result.code, 0, "An incompatible selector must not be reported as ready.");
	assert.equal(state.writes.length, 0);
});

test("setup refuses nullable fields required by the renderer", async (t) => {
	const fields = existingFields();
	fields.find((field) => field.slug === "title").required = false;
	const { state, url } = await fixture(t, fields);
	assert.notEqual((await run(url)).code, 0);
	assert.equal(state.writes.length, 0);
});

test("setup rejects unsafe targets before sending an admin token", async () => {
	for (const url of ["http://blog.example.com", "file:///tmp/site", "https://user:password@blog.example.com"]) {
		const result = await run(url, "setup-test-token");
		assert.notEqual(result.code, 0);
		assert.match(result.output, /HTTPS|credentials|HTTP\(S\)/);
		assert.ok(!result.output.includes("setup-test-token"));
	}
});

test("setup rejects an instance path instead of silently targeting another origin path", async (t) => {
	const { state, url } = await fixture(t);
	const result = await run(url + "/_emdash/admin");
	assert.notEqual(result.code, 0);
	assert.match(result.output, /origin without a path/);
	assert.equal(state.writes.length, 0);
});
