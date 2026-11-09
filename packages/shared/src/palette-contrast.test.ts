import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const AA = 4.5;

type Tokens = Map<string, string>;

/** `--name: value;` declarations of one block, in order. */
function declarations(block: string): Tokens {
	const found: Tokens = new Map();
	for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) found.set(match[1], match[2].trim());
	return found;
}

/** Resolves `#hex` and `var(--other)`; anything else (color-mix, …) is unresolved. */
function resolve(name: string, scope: Tokens, theme: Tokens): string | undefined {
	let value = scope.get(name) ?? theme.get(name);
	for (let hops = 0; value !== undefined && hops < 5; hops++) {
		if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
		const next = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
		value = next ? (scope.get(next) ?? theme.get(next)) : undefined;
	}
	return undefined;
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const channel = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

interface Palette {
	app: string;
	theme: string;
	light: string;
	dark: string;
}

async function palettes(): Promise<Palette[]> {
	const web = await readFile(`${ROOT}apps/web/src/styles/global.css`, "utf8");
	const mobile = await readFile(`${ROOT}apps/mobile/src/global.css`, "utf8");
	const block = (source: string, pattern: RegExp, label: string) => {
		const match = pattern.exec(source);
		assert.ok(match, `${label} block not found`);
		return match[1];
	};
	return [
		{
			app: "web",
			theme: block(web, /@theme static \{([\s\S]*?)\n\}/, "web theme"),
			light: block(web, /\n:root \{([\s\S]*?)\n\}/, "web light"),
			dark: block(web, /\.dark,\s*\[data-theme="dark"\] \{([\s\S]*?)\n\}/, "web dark"),
		},
		{
			app: "mobile",
			theme: block(mobile, /@theme \{([\s\S]*?)\n\}/, "mobile theme"),
			light: block(mobile, /@variant light \{([\s\S]*?)\n\t\t\}/, "mobile light"),
			dark: block(mobile, /@variant dark \{([\s\S]*?)\n\t\t\}/, "mobile dark"),
		},
	];
}

/** [foreground token, background token, what it is] */
const PAIRS: ReadonlyArray<readonly [string, string, string]> = [
	["--accent", "--background", "accent text on the page"],
	["--accent", "--surface", "accent text on a card"],
	["--accent-foreground", "--accent", "button label on accent"],
	["--muted", "--background", "muted text on the page"],
	["--field-placeholder", "--field-background", "input placeholder"],
];

test("both apps keep key text pairs at WCAG AA in both themes", async () => {
	const failures: string[] = [];
	let checked = 0;
	for (const palette of await palettes()) {
		const theme = declarations(palette.theme);
		for (const mode of ["light", "dark"] as const) {
			const scope = declarations(palette[mode]);
			// The dark block of the web app inherits what it does not override from :root.
			const inherited = mode === "dark" && palette.app === "web" ? declarations(palette.light) : new Map();
			const merged = new Map([...inherited, ...scope]);
			for (const [foreground, background, label] of PAIRS) {
				const fg = resolve(foreground, merged, theme);
				const bg = resolve(background, merged, theme);
				if (!fg || !bg) continue; // e.g. a color-mix() token: not resolvable here
				checked++;
				const ratio = contrast(fg, bg);
				if (ratio < AA) failures.push(`${palette.app} ${mode}: ${label} ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
			}
		}
	}
	assert.deepEqual(failures, []);
	// The core pairs must resolve in all four palettes, so the test cannot pass by skipping them.
	assert.ok(checked >= 4 * 3, `only ${checked} pairs were checked`);
});

test("the light accent is the deepened orange and the dark accent the full logo orange", async () => {
	for (const palette of await palettes()) {
		const theme = declarations(palette.theme);
		const light = declarations(palette.light);
		const dark = new Map([...(palette.app === "web" ? light : []), ...declarations(palette.dark)]);
		assert.equal(resolve("--accent", light, theme), "#bf3302", `${palette.app} light`);
		assert.equal(resolve("--accent", dark, theme), "#ff4704", `${palette.app} dark`);
	}
});
