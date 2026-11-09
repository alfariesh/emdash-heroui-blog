// Add the seed's ads schema through EmDash's API, including on an existing database.
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { EmDashClient } from "emdash/client";

const { values } = parseArgs({ options: { url: { type: "string", default: "http://localhost:4321" } } });
const url = new URL(values.url);
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (!["http:", "https:"].includes(url.protocol)) {
	throw new Error("The instance URL must use HTTP(S).");
}
if (url.username || url.password) {
	throw new Error("Do not put credentials in the instance URL; use EMDASH_TOKEN.");
}
if (!isLocal && url.protocol !== "https:") {
	throw new Error("Remote instances require HTTPS to protect the admin token.");
}
if (url.pathname !== "/" || url.search || url.hash) {
	throw new Error("Use the instance origin without a path, query, or fragment.");
}
if (!isLocal && !process.env.EMDASH_TOKEN) {
	throw new Error("Set EMDASH_TOKEN to an admin-scoped token for a remote instance.");
}
const client = new EmDashClient({
	baseUrl: url.origin,
	token: process.env.EMDASH_TOKEN,
	devBypass: isLocal && !process.env.EMDASH_TOKEN,
});
const seed = JSON.parse(await readFile(new URL("../seed/seed.json", import.meta.url), "utf8"));
const { fields, ...definition } = seed.collections.find((collection) => collection.slug === "ads");

// Inspect the target before writing; reruns preserve entries and existing field settings.
const existing = (await client.collections()).find((collection) => collection.slug === "ads");
const currentFields = existing ? (await client.collection("ads")).fields : [];
if (existing && (existing.routable !== false || !definition.supports.every((support) => existing.supports.includes(support)))) {
	throw new Error("The existing ads collection needs routable=false and drafts/revisions enabled in Content Types.");
}
const issues = [];
for (const field of fields) {
	const current = currentFields.find((item) => item.slug === field.slug);
	if (!current) continue;
	if (current.type !== field.type) {
		issues.push(`ads.${field.slug} must be ${field.type}`);
		continue;
	}
	if (field.required && !current.required) issues.push(`ads.${field.slug} must be required`);
	const expectedOptions = field.validation?.options;
	if (expectedOptions && (!Array.isArray(current.validation?.options) ||
		!expectedOptions.every((option) => current.validation.options.includes(option)))) {
		issues.push(`ads.${field.slug} must offer: ${expectedOptions.join(", ")}`);
	}
}
if (issues.length > 0) {
	throw new Error(`${issues.join("; ")}. Fix these in Content Types before retrying. No fields were changed.`);
}

if (!existing) {
	await client.createCollection(definition);
	console.log(`Created ads collection on ${url.origin}`);
}
for (const [sortOrder, field] of fields.entries()) {
	if (currentFields.some((current) => current.slug === field.slug)) continue;
	await client.createField("ads", { ...field, validation: field.validation ?? null, sortOrder });
	console.log(`Added ads.${field.slug}`);
}
console.log("Ads schema is ready. Manage Ads in the EmDash admin; publish entries after editing.");
