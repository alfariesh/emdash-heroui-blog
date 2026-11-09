import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../../", import.meta.url));
const SRC = path.join(APP, "src");
const LAYOUT = path.join(SRC, "app", "_layout.tsx");
const FAMILY = /GoogleSans_[A-Za-z0-9_]+/g;

/** The full Google Sans faces are ~2.1 MB; the subsets are ~0.27 MB. */
const MAX_FACE_BYTES = 400_000;

async function sourceFiles(): Promise<string[]> {
	const entries = await readdir(SRC, { recursive: true });
	return entries
		.filter((entry) => /\.(tsx?|css)$/.test(entry) && !/\.test\.ts$/.test(entry))
		.map((entry) => path.join(SRC, entry))
		.filter((file) => file !== LAYOUT);
}

async function loadedFamilies(): Promise<{ names: string[]; files: string[] }> {
	const layout = await readFile(LAYOUT, "utf8");
	const block = /const FONTS = \{([\s\S]*?)\n\};/.exec(layout)?.[1];
	assert.ok(block, "the FONTS map is missing from _layout.tsx");
	return {
		names: [...block.matchAll(/^\s*(GoogleSans_\w+):/gm)].flatMap((match) => (match[1] ? [match[1]] : [])),
		files: [...block.matchAll(/require\("([^"]+\.ttf)"\)/g)].flatMap((match) => (match[1] ? [match[1]] : [])),
	};
}

test("every Google Sans family the app refers to is loaded, and every loaded one is used", async () => {
	const used = new Set<string>();
	for (const file of await sourceFiles()) {
		for (const name of (await readFile(file, "utf8")).match(FAMILY) ?? []) used.add(name);
	}
	const { names } = await loadedFamilies();
	assert.deepEqual([...used].sort(), [...names].sort());
});

test("the loaded faces are the subsets, not the 2 MB originals, and ship their license", async () => {
	const { names, files } = await loadedFamilies();
	assert.equal(files.length, names.length);
	for (const file of files) {
		const { size } = await stat(path.join(path.dirname(LAYOUT), file));
		assert.ok(size > 10_000 && size < MAX_FACE_BYTES, `${file} is ${size} bytes`);
	}
	const license = await readFile(path.join(APP, "assets", "fonts", "LICENSE_FONT"), "utf8");
	assert.match(license, /SIL OPEN FONT LICENSE/i);
});
