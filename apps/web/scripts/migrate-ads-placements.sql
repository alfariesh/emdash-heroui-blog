-- EmDash 1.4 / SQLite-D1: select -> multiSelect needs a manual content migration.
-- Back up first, stop ad editing, deploy the array-compatible reader, then run
-- this entire file with wrangler d1 execute DB --file ... (--local or --remote).
-- D1 file imports are transactional. Re-running this file is safe.
-- Keep the same field/column: no replacement fields or entries are created.
-- Restart all app instances afterward (redeploy on Workers) to clear schema caches.

-- Fail before any write on an unexpected schema or malformed revision snapshot.
SELECT CASE WHEN
  (SELECT COUNT(*) FROM _emdash_fields f JOIN _emdash_collections c ON c.id = f.collection_id
   WHERE c.slug = 'ads' AND f.slug = 'placement'
     AND ((f.type = 'select' AND f.column_type = 'TEXT') OR (f.type = 'multiSelect' AND f.column_type = 'JSON'))
     AND f.indexed = 0 AND f.searchable = 0) = 1
  AND NOT EXISTS (SELECT 1 FROM revisions WHERE collection = 'ads'
    AND CASE WHEN json_valid(data) THEN json_type(data) <> 'object' ELSE 1 END)
THEN 1 ELSE json('Ads placement migration: incompatible schema or revision data') END AS preflight;

-- Accept only known choices, including the original seed's Indonesian labels.
WITH values_to_check(value, is_array) AS (
  SELECT placement, CASE WHEN json_valid(placement) THEN json_type(placement) = 'array' ELSE 0 END FROM ec_ads
  UNION ALL
  SELECT json_extract(data, '$.placement'), json_type(data, '$.placement') = 'array'
    FROM revisions WHERE collection = 'ads'
), choices AS (
  SELECT j.value, j.type FROM values_to_check v, json_each(
    CASE WHEN v.is_array THEN v.value
         WHEN v.value IS NULL OR v.value = '' THEN '[]' ELSE json_array(v.value) END
  ) j
)
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM choices WHERE type <> 'text' OR value NOT IN
    ('Home', 'Article sidebar', 'Below the article', 'Beranda', 'Sidebar artikel', 'Bawah artikel')
) THEN 1 ELSE json('Ads placement migration: unknown placement; inspect before migrating') END AS valid_choices;

UPDATE ec_ads SET placement = (
  SELECT json_group_array(CASE j.value
    WHEN 'Beranda' THEN 'Home' WHEN 'Sidebar artikel' THEN 'Article sidebar'
    WHEN 'Bawah artikel' THEN 'Below the article' ELSE j.value END)
  FROM json_each(CASE
    WHEN placement IS NULL OR placement = '' THEN '[]'
    WHEN json_valid(placement) THEN CASE WHEN json_type(placement) = 'array' THEN placement ELSE json_array(placement) END
    ELSE json_array(placement) END) j
);

-- Migrate every retained draft/live/historical snapshot, so restoring an old
-- revision cannot bring the previous scalar shape back into the editor.
UPDATE revisions SET data = json_set(data, '$.placement', json((
  SELECT json_group_array(CASE j.value
    WHEN 'Beranda' THEN 'Home' WHEN 'Sidebar artikel' THEN 'Article sidebar'
    WHEN 'Bawah artikel' THEN 'Below the article' ELSE j.value END)
  FROM json_each(CASE
    WHEN json_type(data, '$.placement') = 'array' THEN json_extract(data, '$.placement')
    WHEN json_extract(data, '$.placement') IS NULL OR json_extract(data, '$.placement') = '' THEN '[]'
    ELSE json_array(json_extract(data, '$.placement')) END) j
))) WHERE collection = 'ads';

UPDATE _emdash_fields SET type = 'multiSelect', column_type = 'JSON',
  default_value = '["Home"]',
  validation = json_set(COALESCE(validation, '{}'), '$.options', json('["Home","Article sidebar","Below the article"]'))
WHERE slug = 'placement' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'ads');

UPDATE _emdash_fields SET widget = 'ads-editor:wib-datetime'
WHERE slug IN ('starts_at', 'ends_at') AND type = 'datetime'
  AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'ads');
