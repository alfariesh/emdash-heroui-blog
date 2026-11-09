import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Whole words that must not remain in first-party copy.
 * Each word is joined so this file itself does not contain the word.
 */
const TOKENS = [
	"tuli" + "san",
	"komen" + "tar",
	"beran" + "da",
	"pengatu" + "ran",
	"jela" + "jah",
	"tersim" + "pan",
	"katego" + "ri",
	"hala" + "man",
	"bel" + "um",
	"me" + "nit",
	"ti" + "dak",
	"ju" + "dul",
	"ringka" + "san",
	"cata" + "tan",
	"gaga" + "san",
	"ceri" + "ta",
	"perang" + "kat",
	"arti" + "kel",
	"jelaja" + "hi",
	"kem" + "bali",
	"sam" + "pul",
	"ten" + "tang",
	"id-" + "ID",
	"Ba" + "hasa",
];

const TOKEN = new RegExp(`\\b(?:${TOKENS.join("|")})\\b`, "i");
const SKIP_DIRS = new Set(["node_modules", "dist", ".astro", ".git"]);
const TEXT_EXT = new Set([".md", ".ts", ".tsx", ".mjs", ".json", ".jsonc", ".astro", ".css"]);

async function filesUnder(dir: string): Promise<string[]> {
	const found: string[] = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return found;
	}
	for (const entry of entries) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) found.push(...(await filesUnder(full)));
		else if (TEXT_EXT.has(path.extname(entry.name))) found.push(full);
	}
	return found;
}

async function markdownFiles(dir: string): Promise<string[]> {
	const found: string[] = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return found;
	}
	for (const entry of entries) {
		if (SKIP_DIRS.has(entry.name) || entry.name === ".agents") continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) found.push(...(await markdownFiles(full)));
		else if (entry.name.endsWith(".md")) found.push(full);
	}
	return found;
}

test("first-party copy has no Indonesian tokens", async () => {
	const roots = [
		path.join(ROOT, "apps/web/src"),
		path.join(ROOT, "apps/web/seed"),
		path.join(ROOT, "apps/web/scripts"),
		path.join(ROOT, "apps/mobile/src"),
		path.join(ROOT, "packages/shared/src"),
	];
	const files = [
		...(await markdownFiles(ROOT)),
		...(await Promise.all(roots.map((root) => filesUnder(root)))).flat(),
		path.join(ROOT, "apps/web/emdash-env.d.ts"),
		path.join(ROOT, "apps/mobile/app.config.ts"),
		path.join(ROOT, "package.json"),
	];
	const hits: string[] = [];
	for (const file of files) {
		if (file.endsWith("pnpm-lock.yaml")) continue;
		const text = await readFile(file, "utf8");
		text.split("\n").forEach((line, index) => {
			if (TOKEN.test(line)) hits.push(`${path.relative(ROOT, file)}:${index + 1}: ${line.trim()}`);
		});
	}
	assert.deepEqual(hits, []);
});
