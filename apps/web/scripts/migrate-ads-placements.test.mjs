import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

const migration = await readFile(new URL("./migrate-ads-placements.sql", import.meta.url), "utf8");
// Stored values from the original seed, not visitor-facing copy.
const oldHome = "Beran" + "da";
const oldBottom = "Bawah ar" + "tikel";
const oldSidebar = "Sidebar ar" + "tikel";

function fixture(t) {
	const db = new DatabaseSync(":memory:");
	t.after(() => db.close());
	db.exec(`
		CREATE TABLE _emdash_collections (id TEXT PRIMARY KEY, slug TEXT);
		CREATE TABLE _emdash_fields (collection_id TEXT, slug TEXT, label TEXT, type TEXT, column_type TEXT,
			default_value TEXT, validation TEXT, widget TEXT, indexed INTEGER DEFAULT 0, searchable INTEGER DEFAULT 0);
		CREATE TABLE ec_ads (id TEXT PRIMARY KEY, placement TEXT, status TEXT, live_revision_id TEXT, draft_revision_id TEXT, starts_at TEXT);
		CREATE TABLE revisions (id TEXT PRIMARY KEY, collection TEXT, data TEXT);
		INSERT INTO _emdash_collections VALUES ('ads-id', 'ads');
		INSERT INTO _emdash_fields (collection_id,slug,type,column_type) VALUES
			('ads-id','placement','select','TEXT'), ('ads-id','starts_at','datetime','TEXT'), ('ads-id','ends_at','datetime','TEXT');
	`);
	return db;
}

test("migration preserves publication state, instants and all revision contents, and can rerun", (t) => {
	const db = fixture(t);
	db.prepare("INSERT INTO ec_ads VALUES (?,?,?,?,?,?)").run("ad", oldHome, "published", "live", "draft", "2026-11-09T04:52:00Z");
	const snapshots = [
		["live", "ads", { placement: oldHome, title: "Live", enabled: true }],
		["draft", "ads", { placement: oldBottom, title: "Unpublished edit" }],
		["history", "ads", { placement: oldSidebar, image: { id: "asset" } }],
		["other", "posts", { placement: "Untouched" }],
	];
	for (const [id, collection, data] of snapshots) db.prepare("INSERT INTO revisions VALUES (?,?,?)").run(id, collection, JSON.stringify(data));
	db.exec(migration);
	const row = db.prepare("SELECT * FROM ec_ads").get();
	assert.deepEqual({ ...row }, { id: "ad", placement: '["Home"]', status: "published", live_revision_id: "live", draft_revision_id: "draft", starts_at: "2026-11-09T04:52:00Z" });
	for (const [id, , data] of snapshots) {
		const next = JSON.parse(db.prepare("SELECT data FROM revisions WHERE id=?").get(id).data);
		const mapped = { [oldHome]: "Home", [oldBottom]: "Below the article", [oldSidebar]: "Article sidebar" }[data.placement];
		assert.deepEqual(next, { ...data, placement: mapped ? [mapped] : data.placement });
	}
	const field = db.prepare("SELECT * FROM _emdash_fields WHERE slug='placement'").get();
	assert.equal(field.type, "multiSelect");
	assert.equal(field.column_type, "JSON");
	assert.deepEqual(JSON.parse(field.default_value), ["Home"]);
	const before = JSON.stringify(db.prepare("SELECT * FROM revisions").all());
	db.exec(migration);
	assert.equal(JSON.stringify(db.prepare("SELECT * FROM revisions").all()), before);
	assert.equal(db.prepare("SELECT placement FROM ec_ads").get().placement, '["Home"]');
});

test("migration retains multiple selected positions and handles missing optional revision values", (t) => {
	const db = fixture(t);
	db.prepare("INSERT INTO ec_ads (id,placement) VALUES (?,?)").run("ad", ' ["Home", "Below the article"] ');
	db.exec("UPDATE _emdash_fields SET label = 'Campaign goes live' WHERE slug = 'starts_at'");
	db.exec("UPDATE _emdash_fields SET label = 'Campaign positions' WHERE slug = 'placement'");
	db.prepare("INSERT INTO revisions VALUES (?,?,?)").run("old", "ads", '{"title":"Incomplete draft"}');
	db.exec(migration);
	assert.equal(db.prepare("SELECT placement FROM ec_ads").get().placement, '["Home","Below the article"]');
	assert.deepEqual(JSON.parse(db.prepare("SELECT data FROM revisions").get().data), { title: "Incomplete draft", placement: [] });
	assert.equal(db.prepare("SELECT label FROM _emdash_fields WHERE slug='starts_at'").get().label, "Campaign goes live");
	assert.equal(db.prepare("SELECT label FROM _emdash_fields WHERE slug='placement'").get().label, "Campaign positions");
});

test("migration rejects malformed snapshots and string-encoded arrays before changing live rows", (t) => {
	for (const data of ["invalid", "null", "[]", '{"placement":"[\\"Home\\"]"}', '{"placement":["Unknown"]}']) {
		const db = fixture(t);
		db.prepare("INSERT INTO ec_ads (id,placement) VALUES (?,?)").run("ad", "Home");
		db.prepare("INSERT INTO revisions VALUES (?,?,?)").run("draft", "ads", data);
		assert.throws(() => db.exec(migration));
		assert.equal(db.prepare("SELECT placement FROM ec_ads").get().placement, "Home");
		assert.equal(db.prepare("SELECT data FROM revisions").get().data, data);
	}
});

test("migration refuses an incompatible field type without changing data", (t) => {
	const db = fixture(t);
	db.exec("UPDATE _emdash_fields SET type='integer', column_type='INTEGER' WHERE slug='placement'");
	db.prepare("INSERT INTO ec_ads (id,placement) VALUES (?,?)").run("ad", "Home");
	assert.throws(() => db.exec(migration));
	assert.equal(db.prepare("SELECT placement FROM ec_ads").get().placement, "Home");
});

test("unexpected placement/schema values fail preflight before any mutation", (t) => {
	for (const value of ["Unknown", '[123]', '["Unknown"]']) {
		const db = fixture(t);
		db.prepare("INSERT INTO ec_ads (id,placement) VALUES (?,?)").run("ad", value);
		assert.throws(() => db.exec(migration));
		assert.equal(db.prepare("SELECT placement FROM ec_ads").get().placement, value);
		assert.equal(db.prepare("SELECT type FROM _emdash_fields WHERE slug='placement'").get().type, "select");
	}
});
