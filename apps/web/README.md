# @blog/web

An Astro + [EmDash](https://emdashcms.com) blog with a HeroUI v3 interface (Tailwind CSS v4). It runs on Cloudflare Workers with D1 (database) and R2 (media). Deploy steps are in the root README.

```bash
pnpm dev        # from this folder or from the repo root
```

| Page | Route |
|---|---|
| Home | `/` |
| All posts | `/posts` |
| Post | `/posts/:slug` |
| Category / tag | `/category/:slug`, `/tag/:slug` |
| Search | `/search` |
| Static page | `/pages/:slug` |
| RSS | `/rss.xml` |
| Admin | `/_emdash/admin` |

## Public API (`/api/v1`)

Read-only JSON for the mobile app. Only published content is returned; drafts are always 404. Response types and the client live in `@blog/shared` (`packages/shared/src/api/`).

| Endpoint | Returns |
|---|---|
| `GET /api/v1/ads?placement=home\|post_bottom` | One eligible banner or null, with a short-lived schedule lease (`no-store`) |
| `GET /api/v1/site` | Title, tagline, logo, and `primary` menu items |
| `GET /api/v1/posts?cursor=&limit=&category=&tag=` | Post summaries (newest first) + `nextCursor` |
| `GET /api/v1/posts/:slug` | Post detail + Portable Text content, and `audio` (MP3 URL, length, narrator) when the post has narration |
| `GET /api/v1/posts/:slug/audio` | "Listen to this article": MP3 URL plus per-word timings for read-along highlighting; 404 when the post has no audio |
| `GET /api/v1/posts/:slug/comments` | Approved comments (threaded), for reading in the app |
| `POST /api/v1/devices`, `DELETE /api/v1/devices/:token` | Register or remove an app push token for new-post notifications (limited to 20 requests per minute per IP) |
| `GET /api/v1/pages/:slug` | A static page, for example `about` |
| `GET /api/v1/categories`, `GET /api/v1/tags` | Terms plus a published-post count |
| `GET /api/v1/search?q=` | Search results across posts and pages |

Format: success `{ "ok": true, "data": … }` (lists also include `"nextCursor"`), failure `{ "ok": false, "error": { "status", "code", "message" } }`. Every image URL is absolute and built from the request origin. Cache: `max-age=60, stale-while-revalidate=300`.

```bash
curl http://localhost:4321/api/v1/posts?limit=2
```

From the Android emulator use `http://10.0.2.2:4321`; from a physical phone use the Mac's LAN IP and run the web app so it listens on the network: `pnpm dev:stop` then `pnpm --filter @blog/web dev --host`. In production, `EMDASH_SITE_URL` is set in `vars` in `wrangler.jsonc`; on Workers the request URL already uses the public domain, so API, canonical, and RSS URLs are correct on their own.

## App links (Universal Links / App Links)

So that `https://your-domain/posts/…` (and `/pages/…`, `/category/…`, `/tag/…`) opens in the mobile app, the site serves two verification files. Their contents come from `vars` in `wrangler.jsonc`; when those are empty, the files answer 404.

| Variable | Value |
|---|---|
| `APP_LINKS_IOS_APP_IDS` | `<Team ID>.<bundle id>`, for example `ABCDE12345.com.example.blog` (several allowed, separated by commas) |
| `APP_LINKS_ANDROID_PACKAGE` | Android package (the app's `APP_ID`), for example `com.example.blog` |
| `APP_LINKS_ANDROID_SHA256` | SHA-256 fingerprint of the signing certificate, `AB:CD:…` (several allowed, separated by commas) |
| `APP_LINKS_IOS_STORE_ID` | Numeric App Store ID (App Store Connect → App Information → Apple ID). Shows Safari's Smart App Banner on every page; the Open button opens the same page in the app |

After `pnpm run deploy`, check `https://your-domain/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`: both must be 200 with JSON. The app-side steps are in `apps/mobile/README.md`.

## Article audio ("Listen to this article")

The `emdash-plugin-article-audio` plugin turns posts into narrated MP3s with ElevenLabs or Google Cloud text-to-speech, with word timestamps and `[expression tags]`. It is registered in `astro.config.mjs` and installed from `vendor/` until it is published to npm.

- Admin → **Plugins** → article-audio: engine, API keys (stored encrypted), default voice and model, which collections get audio, and *Generate on publish*. **Silent test audio** needs no key and is meant for local testing.
- In the post editor, the **Audio** panel (Editor role and up) generates, previews, replaces and deletes the audio. **Voice & script** picks the voice per post, skips blocks, rewords what is read and adds tags such as `[excited]` or `[pause]` without changing the page.
- Posts with audio show a player under the byline (`src/components/islands/ArticleAudio.tsx`). *Follow along* highlights the word being read and scrolls with it (`src/lib/read-along.ts`, CSS Custom Highlight API); a compact player floats in when the card scrolls away.
- The mobile app reads `/api/v1/posts/:slug/audio`.
- Each generation is billed by the engine. ElevenLabs costs about $0.08 per 1,000 characters on v4/v3/Multilingual v2 and half that on Flash.

## Push notifications

The EmDash plugin `push-notifications` (`src/plugins/push-notifications/`) sends one notification to the mobile app each time a post is published, immediately or on a schedule, through the Expo push service. Publishing again, or editing a post that was already announced, does not send another one.

- Settings are in the admin → **Plugins** → push-notifications: the **Send new-post notifications** switch and the **Expo access token** (only when *Enhanced push security* is on for the Expo project; stored encrypted).
- Device tokens live in plugin storage; tokens that are no longer valid are removed automatically.
- Worker logs (`pnpm exec wrangler tail`) record `New-post notification` with the URL and the sent/failed counts.
- `ratelimits` in `wrangler.jsonc` limits device registration; `namespace_id` must be unique in your Cloudflare account.

The app-side steps (EAS project, Firebase) are in `apps/mobile/README.md`.

## Internal ads

The **Ads** collection (`ads`) manages web and native app banners through the CMS. New installations get the schema from the seed. For an existing database, run this once after `pnpm dev`:

```bash
pnpm --filter @blog/web setup:ads
```

The command adds missing collections/fields through the EmDash API and configures the Ads schedule widgets. Rerunning it is safe. An existing schema is checked before any write: field type, required fields, placement options, and draft/revision support must match.

To upgrade the original single-placement schema on SQLite/D1, back up `_emdash_fields`, `ec_ads`, and `revisions`, pause ad editing, deploy the new reader, then run the migration below. It converts the existing field and every retained revision in place, preserving publication state, IDs and schedule instants; it also normalizes the original Indonesian choices. Run against `--local` first; use `--remote` for the deployed database. The migration refuses unknown choices and can be rerun.

```bash
pnpm --filter @blog/web exec wrangler d1 export DB --local --table _emdash_fields --table ec_ads --table revisions --output /tmp/ads-backup.sql
pnpm --filter @blog/web exec wrangler d1 execute DB --local --file scripts/migrate-ads-placements.sql
pnpm --filter @blog/web setup:ads
```

After the SQL migration, restart every app instance before resuming editing: EmDash caches validation schemas in memory. Locally, restart the dev server to regenerate `emdash-env.d.ts`; on Workers, redeploy the array-compatible build to clear the old isolates. The migration targets EmDash 1.4's SQLite/D1 layout; inspect it before applying it to another storage adapter or EmDash version. Keep the backup outside the repository.

For a production instance, set `EMDASH_TOKEN` to an admin-scoped token in the environment, then run `pnpm --filter @blog/web setup:ads --url https://blog.example.com`. A remote target must be HTTPS; use the origin with no path, query, fragment, or URL credentials. The web code also has to be deployed before the slots appear. Do not put the token in code or in the mobile app.

In the admin → **Ads**, create an entry, pick a banner from media, fill in a full `http://` or `https://` URL, check one or more **Placements**, turn on **Active**, then **publish**. One entry can serve any combination of positions. Save as a draft when it is not ready. Changes to an ad that is already published also have to be published before they apply, including a change to the Active switch.

| Placement | Where it appears |
|---|---|
| Home | After the post list on the home page |
| Article sidebar | The article's side column, on desktop screens only (from 1024px); it scrolls with the page |
| Below the article | After the body and tags, before comments; on desktop it is the fallback when there is no sidebar ad |

**Starts** and **Ends** use the native `ads-editor` plugin's Kumo calendar and hour/minute selectors. Set the site's IANA **Timezone** in **Settings → General** (for example `Asia/Jakarta` for WIB, `America/New_York`, or `UTC`). An unset site uses UTC. The editor reads this setting through EmDash's admin manifest, so content editors do not need permission to read all site settings. It refreshes on opening the editor or returning to the browser tab and disables schedule editing until the timezone is available. Changing the timezone changes how stored instants are displayed; it does not rewrite schedules. The setting also controls EmDash's other date/time editors.

Dates are stored as UTC automatically. Clock times skipped by a daylight saving change are rejected; when a local time occurs twice, select its **UTC offset** to choose the occurrence. Both fields are optional; **Clear** removes the bound. Opening the picker does not rewrite existing instants. The start is inclusive and the end is exclusive; the end must be after the start. The schedule is checked on every page request, so a published ad can start or stop without a cron job and without another deploy. A page that is already open does not update on its own. For API input, use a timestamp with a time zone, for example `2026-11-08T09:00:00+07:00`.

To upgrade the original WIB-only editor, set the CMS timezone to `Asia/Jakarta` first if that is the site's intended zone, deploy the new editor, then run `setup:ads`. It installs `ads-editor:datetime` and removes `WIB` only from the original stock field labels, preserving custom labels. The old `ads-editor:wib-datetime` widget key remains an alias so existing schemas keep working during rollout. New OSS installations choose their own CMS timezone; the seed does not force WIB.

At most **one ad is visible per article** at each screen size. Desktop prefers the sidebar and uses the bottom slot when the sidebar is empty. Below 1024px only the below-the-article ad is shown; a sidebar ad is not moved down. The sidebar banner sits outside the sticky table-of-contents and widget group, so it scrolls with the page.

The home and below-the-article image frame uses a **3:1** ratio (prepare a **1200 × 400 px** asset); the sidebar uses **6:5** (prepare a **600 × 500 px** asset). The frame reserves its space when the page renders so an image that loads later does not push the post down. An image with a different ratio is still shown whole inside the frame, with empty space as needed. The CMS still accepts images of other sizes.

The highest **Priority** wins within a placement; ID ascending breaks ties. Disabled, draft, expired, malformed or incomplete ads are skipped. Empty slots leave no space. The native app uses Home and Below the article only, both 3:1; it refreshes through the public API within 60 seconds or at the next schedule boundary and does not persist ads offline. There is no impression or click tracking.

### Admin sidebar names

The sidebar reads each collection's **Label** from the CMS schema. Labels are editable metadata; changing the admin interface language does not translate custom collection or field labels in EmDash 1.4. This template seeds English labels (`Ads`, `Posts`, `Pages`), while an existing database keeps its saved labels after a deploy. `setup:ads` installs the schedule widget without overwriting custom field labels.

To rename an existing collection, open **Content Types**, edit the collection, set **Label** to `Ads` and **Singular label** to `Ad`, then save. Keep the slug `ads`: code and API clients use that stable identifier. Field labels can be edited in the same content type. Per-admin-language collection labels require support in EmDash core; this template does not rewrite the admin DOM or patch dependency files to simulate translation.

## `src/` layout

```
src/
├── components/          Astro components (server-rendered, no JS)
│   └── islands/         Interactive HeroUI React components (header, search, theme)
├── layouts/Base.astro   Main layout + EmDash wiring (menu, SEO, widgets)
├── lib/                 Web-only helpers (locale, theme, public API helpers)
├── pages/               Routes (all server-rendered); api/v1/ = the public JSON API
├── styles/global.css    Tailwind v4 + HeroUI + a few overrides
└── live.config.ts       EmDash loader registration (leave it alone)
```

Helpers the mobile app also uses live in `packages/shared` (`@blog/shared`). The full technical guide for AI agents is in `AGENTS.md`.
