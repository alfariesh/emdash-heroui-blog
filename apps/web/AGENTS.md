This is the web app of the monorepo (`apps/web`): an EmDash site -- a CMS built on Astro with a full admin UI -- running on **Cloudflare Workers** with **D1** (database) and **R2** (media). It is also the content source for the mobile app. See the root `AGENTS.md` for the workspace layout.

## Commands

```bash
pnpm dev              # Astro dev server in workerd with local D1/R2 (state in .wrangler/)
pnpm typecheck        # astro check (needs TypeScript 6; astro check does not support TS 7)
pnpm run deploy       # astro build && wrangler deploy (use `run`: `pnpm deploy` is a pnpm built-in)
pnpm run cf-typegen   # regenerate worker-configuration.d.ts after editing wrangler.jsonc
npx emdash types      # Regenerate TypeScript types from a running site
```

Local dev reads `.env` (never committed): `EMDASH_ENCRYPTION_KEY`, and `EMDASH_SITE_URL=` **empty**, which overrides the production value in `wrangler.jsonc` `vars` so passkeys stay on localhost. Local D1/R2 data lives in `.wrangler/state`. `data.db*` and `uploads/`, if present, are leftovers from the earlier Node/SQLite setup and are no longer used.

Production secrets: `pnpm exec wrangler secret put EMDASH_ENCRYPTION_KEY` (generate with `npx emdash secrets generate`, back it up). Never put secrets in `wrangler.jsonc` or read them via `import.meta.env`.

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config: Cloudflare adapter, `emdash()` with `d1()` + `r2()`                  |
| `wrangler.jsonc`         | Worker name, D1/R2/Images bindings, `EMDASH_SITE_URL`, custom domain, cron         |
| `src/worker.ts`          | Worker entry: Astro handler + `scheduled()` for scheduled publishing (keep it)     |
| `worker-configuration.d.ts` | Generated binding types (`pnpm run cf-typegen`)                                 |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `src/lib/app-links.ts`   | Builds `/.well-known/apple-app-site-association` and `assetlinks.json` from the `APP_LINKS_*` vars |
| `src/plugins/push-notifications/` | Native EmDash plugin: device storage, public register/unregister routes, `content:afterPublish` → Expo push (`expo.ts` is pure and unit-tested) |
| `src/lib/push-devices.ts` | `/api/v1/devices` helpers: body validation, `DEVICES_RATE_LIMIT`, in-process call to the plugin's public routes |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout with EmDash wiring (menus, search, page contributions)                 |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in the repo root at `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

The repo root has `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` so Claude Code, Cursor, and VS Code auto-discover the docs server. Other tools (OpenCode, Windsurf, etc.) need a manual one-time setup -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- When Astro's cache is enabled, pass content-query hints to `Astro.cache.set(cacheHint)`. Use the `WithCacheHint` variants for site settings, menus, taxonomies, and widget areas rendered by cached routes.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Template

A blog with posts, pages, categories, tags, full-text search, comments, and RSS. The UI is **HeroUI v3** (`@heroui/react` + `@heroui/styles`) on **Tailwind CSS v4**, and all visitor-facing text is in **English** (dates use `en-US`; see `src/lib/locale.ts` and `@blog/shared`).

## Pages

| Page        | Path               | What it shows                                                                                   |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| Home        | `/`                | Site title + tagline, category chips, featured post card, "Latest posts" grid                   |
| All posts   | `/posts`           | Horizontal post cards; cursor pagination                                                        |
| Post detail | `/posts/[slug]`    | Breadcrumbs, title, excerpt, bylines, hero image, body + sticky rail (table of contents, widgets), tags, comments, "Read next" |
| Search      | `/search`          | HeroUI SearchField + FTS results with highlighted matches                                       |
| Page        | `/pages/[slug]`    | Static page content (Portable Text)                                                             |
| Category    | `/category/[slug]` | Card grid of posts in a category                                                                |
| Tag         | `/tag/[slug]`      | Card grid of posts with a tag                                                                   |
| RSS         | `/rss.xml`         | Generated feed                                                                                  |
| Public API  | `/api/v1/*`        | Read-only JSON for the mobile app (see below)                                                   |

## Schema

- `posts` collection: `title`, `featured_image`, `content` (Portable Text), `excerpt` (text).
- `pages` collection: `title`, `content` (Portable Text). Used for `/pages/about` etc.
- `ads` collection: non-routable web/native banners with `title`, `image`, `target_url`, `placement` (required `multiSelect` array), `enabled`, optional `starts_at`/`ends_at`, and `priority`. Placement choices are `Home`, `Article sidebar`, `Below the article` (`AD_PLACEMENTS` in `src/lib/ad-selection.ts`). The reader accepts original scalar/Indonesian values during rollout. Upgrade the old select field with `scripts/migrate-ads-placements.sql` (SQLite/D1, including all retained revisions; see README), then run `setup:ads`. New databases use the seed. Drafts/revisions are enabled; edits must be published. Schedule widgets are `ads-editor:wib-datetime`, backed by the native plugin in `src/plugins/ads-editor/`: Kumo calendar/clock, fixed Asia/Jakarta display, UTC storage. Keep `adminEntry` and runtime `admin.entry` identical. A seed change alone does not evolve existing databases.
- Taxonomies: `category`, `tag`.
- Single `primary` menu (Home, Posts, About by default).
- Widget areas: `sidebar` (post rail) and `footer`.

## How HeroUI is wired

- `src/styles/global.css` imports `tailwindcss` then `@heroui/styles` (order matters) and holds the few custom rules: `.container-page`, `.media-frame`, `.article-prose` (extends HeroUI's `.typography-prose`), and overrides for EmDash's widget and comment markup.
- **Astro pages render HeroUI with zero JS** by using the style helpers from `@heroui/styles` (`cardVariants`, `chipVariants`, `buttonVariants`, `avatarVariants`, `breadcrumbsVariants`, `cn`). This keeps EmDash's `<Image>` and `<PortableText>` usable inside HeroUI cards.
- **React islands** (`src/components/islands/`) use `@heroui/react` components where interaction is needed: `SiteHeader` (nav, search, Drawer for mobile; the theme is switched in the footer and in that Drawer, not in the header bar), `SearchPalette` (⌘K search), `SearchForm`, `ThemeSwitcher` (ToggleButtonGroup). Don't put compound components (`Card.Header`…) directly in `.astro` files: each tag becomes a separate React root and loses context. Compose them inside a `.tsx` component instead.
- Look up component APIs with the HeroUI MCP (`get_component_docs`) rather than guessing. HeroUI v3 has no Provider, uses `onPress`, and has no v2 tokens like `primary-500`.
- Dark mode: HeroUI reads a `light`/`dark` class on `<html>`. The choice is stored in a `theme` cookie (`src/lib/theme.ts`); with no cookie, the inline script in `Base.astro` follows the OS.
- Icons: **Hugeicons free set** only. Import icon objects from `@hugeicons/core-free-icons` and render them with `<HugeiconsIcon icon={…} />` from `@hugeicons/react` (in `.astro` files too; pass `className`, not `class`). Inside HeroUI buttons the SVG size is set by HeroUI; elsewhere pass `size`. Don't add another icon library.
- Category icons: the slug → icon *key* map is `CATEGORY_ICONS` in `packages/shared/src/category-icons.ts`; `src/lib/icons.ts` maps keys to Hugeicons (`categoryIcon(slug)`), shown on home category chips, post-card category chips, and the category page header. Tags have no icons. EmDash terms have no custom fields, so icons are configured in code, not in the admin.

## Public JSON API (`src/pages/api/v1/`)

Read-only endpoints for the mobile app and other clients. The EmDash admin API (`/_emdash/api/content/...`) needs a login and must not be used by clients.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/ads?placement=home\|post_bottom` | `ApiAdSlot`: eligible banner or null, `serverTime`, `validUntil`; `no-store`, lease capped at 60 s or next schedule boundary |
| `GET /api/v1/site` | `ApiSite`: title, tagline, logo, locale, origin, `primary` menu items |
| `GET /api/v1/posts?cursor=&limit=&category=&tag=` | `ApiPage<ApiPostSummary>`, newest first; `limit` 1–50 (default 10); unknown category/tag → 404 |
| `GET /api/v1/posts/[slug]` | `ApiPost` (summary + `updatedAt` + Portable Text `content`) |
| `POST /api/v1/devices` | Body `ApiDeviceRegistration` → `ApiDeviceStatus`; registers an Expo push token for new-post notifications. `no-store`, rate-limited (429 `too_many_requests`) |
| `DELETE /api/v1/devices/[token]` | `ApiDeviceStatus` with `registered: false`; fine for unknown tokens |
| `GET /api/v1/posts/[slug]/comments` | `ApiPostComments`: approved comments, threaded (`getComments`), `enabled: false` when comments are off; 404 for drafts |
| `GET /api/v1/pages/[slug]` | `ApiPageEntry` |
| `GET /api/v1/categories`, `GET /api/v1/tags` | `ApiTerm[]` with published-post `count` |
| `GET /api/v1/search?q=&cursor=&limit=` | `ApiPage<ApiSearchResult>` over posts and pages |
| anything else under `/api/v1/` | JSON 404 (`[...path].ts`) |

Rules (enforced in `src/lib/public-api.ts`; types come from `@blog/shared`):

- **Published only.** Collection queries pass `status: "published"`; detail endpoints also check `entry.data.status === "published"`, because `getEmDashEntry` can serve drafts in preview/edit mode. The draft `still-writing` must always be 404.
- **Envelope:** `{ ok: true, data }`, lists `{ ok: true, data, nextCursor }`, errors `{ ok: false, error: { status, code, message } }` with English messages. Bad `limit`/`cursor` → 400 (the live loader re-wraps `InvalidCursorError`, so it is matched by message too).
- **Absolute URLs** for images, avatars, logo, menu items and root-relative links inside Portable Text, built from `context.url.origin`. Portable Text image blocks are rewritten to `{ _type: "image", url, alt, caption, width, height }`.
- **Headers:** `Cache-Control: public, max-age=60, stale-while-revalidate=300` on success (`/ads` and `/devices` are always `no-store`), `no-store` on errors, `Access-Control-Allow-Origin: *`.
- **Public origin:** every absolute URL goes through `publicOrigin()` (`src/lib/site-url.ts`): Astro's `site` when set (only if `EMDASH_SITE_URL` is exported in the *build* environment), else the request origin, which on Workers is already the public host. EmDash itself reads `EMDASH_SITE_URL` at runtime from `wrangler.jsonc` `vars` for passkeys, CSRF and email links; it must be set before the production setup wizard runs, and setup must be done on that domain. Locally it is overridden to empty via `.env`, so `10.0.2.2` / LAN IPs keep working.

## Shared code

Framework-agnostic helpers live in `packages/shared` (`@blog/shared`) so the mobile app can reuse them: `formatDate` / `DEFAULT_LOCALE`, `getReadingTime` / `formatReadingTime`, `resolveBlogSiteIdentity`, and the public API contract (`src/api/`: `Api*` types, `createBlogClient`, `parseSnippet`). `src/lib/locale.ts` wraps `formatDate` with the site locale from EmDash. Put new helpers there only if they have no Astro, EmDash, DOM or React Native imports.

## Customisation

- Colours, radius and shadows are HeroUI theme variables. Override them in the `:root` block at the top of `src/styles/global.css` (e.g. `--accent`, `--radius`); use HeroUI tokens in markup (`bg-surface`, `text-muted`, `bg-accent`, `border-separator`, `shadow-surface`).
- Fonts are configured in `astro.config.mjs` under `fonts:` (`--font-body` → Tailwind `font-sans`, `--font-code` → `font-mono`). Don't rename `--font-code` to `--font-mono`; Tailwind owns that name.
- Post cards: `src/components/PostCard.astro` (`card`, `feature`, `row` variants; optional `category` chip with icon + tags). Fetch both with `getPostTerms()` from `src/lib/post-terms.ts` (two batched queries). Bylines: `src/components/Byline.astro`. Page headings: `src/components/PageIntro.astro`.

## Motion

Motion follows Emil Kowalski's design-engineering rules (skills.sh/emilkowalski/skills): animate only `transform`/`opacity` (and `clip-path`), strong custom curves, UI motion under ~300ms, no animation on keyboard-triggered or high-frequency actions, and a `prefers-reduced-motion` fallback for everything (movement goes, opacity stays). The styles are in the "Motion" section of `src/styles/global.css`.

- **Easing tokens** (`@theme`): `--ease-out` (overrides Tailwind's, which also sharpens HeroUI's own transitions), `--ease-drawer`. Never `ease-in`. HeroUI `.button`/`.toggle-button` presses are retimed to 160ms.
- **Page entrance**: put `data-enter="lead|support|decoration|pop"` on a page's intro elements and stagger them with `style={enterDelay(ms[, index])}` from `src/lib/motion.ts`. One title per page is the `lead`; body content, cards and the largest image (LCP) don't animate in.
- **Press feedback**: HeroUI buttons scale on press already; give other pressable links (chips, cards) the `pressable` utility (`[--press-scale:0.985]` for large surfaces). Post cards press through `.post-card` / `.post-card__link`.
- **Card → article image**: cross-document View Transitions. Elements carry `data-post-image="/posts/<slug>"` (card media and article hero); the inline script in `Base.astro` names only the image being opened or left at `pageswap`/`pagereveal`, so nothing else moves. HeroUI keeps `:root` out of view transitions, so the new page is live immediately; don't add `view-transition-name` to elements statically (duplicate names cancel the transition).
- **Theme switch**: `setThemePreference(pref, themeOrigin(pressEvent))` grows the new palette out of the pressed control; keyboard presses switch instantly.
- **Article**: `TableOfContents.astro` (the sticky rail) builds its list in the browser from the body's h2/h3, giving them readable slug ids (`slugifyHeading`, duplicates get `-2`) and adding an "Introduction" entry when text precedes the first heading. Entries are 14px text on a 20px line with 15px gaps; beside them runs a ruler of 2px ticks on a 5px grid, four per text line, so each entry's first line sits on a tick (`lib/toc.ts` holds the pure maths and its tests; keep `TOC_LINE`/`TICK_PITCH` equal to `--toc-line` and the CSS gap). A script eases a reading cursor along the list by scroll progress and writes `--w` (ticks) plus `--t` (section being read) and `--h` (hover/focus) on the entries; `.toc__tick` / `.toc__link` in `global.css` turn them into width, opacity and colour, so nothing transitions in CSS. The current section's title is accent-coloured while the ticks swell around the cursor as it drifts to the next entry; hovering or keyboard-focusing an entry darkens its text and adds a softer second swell. A list taller than the rail scrolls with the cursor and fades at the clipped edges. Links scroll smoothly (instantly for keyboard use and `prefers-reduced-motion`) and update the hash with `replaceState`. The reading line sits below where a link lands a heading (`scroll-padding-top` + `scroll-margin-top`), or the clicked section would not become current. `BackToTop.astro` is a floating back-to-top button with a reading-progress ring measured through the body only (same rule as the mobile app). `SiteHeader` always sits on a progressive blur. On articles (`Base.astro`'s `headerTitle`) the page script sets `data-title-docked` on `<html>` so the title and current section replace the navigation while reading down past the H1; scrolling up restores it. The script feeds headings to the header through `lib/article-outline.ts`, and the docked title opens them as a table of contents. Header search is `SearchPalette` (⌘K, `/api/v1/search`).

## What not to do

- Don't hard-code colours (`bg-blue-500`); use HeroUI semantic tokens and variants.
- Keep all content cards flat: `--surface-shadow` is zero globally, matching mobile. Do not add card shadows.
- Don't add `getStaticPaths()`; all CMS pages are server-rendered.
- Comments are enabled on posts and rendered on the post detail page (section `id="comments"`, which the mobile app links to for writing). Configure moderation before publishing the site, or remove `commentsEnabled` and the comments UI together. The app reads comments through `/api/v1/posts/[slug]/comments`, never through `/_emdash/api/comments/…`.

## Verified app links (`/.well-known/`)

`src/pages/.well-known/apple-app-site-association.ts` and `assetlinks.json.ts` let `https://<domain>/posts/…` (and `/pages/…`, `/category/…`, `/tag/…`, see `APP_LINK_PATH_PREFIXES` in `@blog/shared`) open the mobile app. They read Worker vars through `cloudflare:workers` `env`: `APP_LINKS_IOS_APP_IDS` (`<Team ID>.<bundle id>`, comma-separated), `APP_LINKS_ANDROID_PACKAGE` and `APP_LINKS_ANDROID_SHA256` (signing-cert fingerprints, comma-separated). Empty vars → plain 404, invalid entries are dropped with a warning. `APP_LINKS_IOS_STORE_ID` (numeric App Store ID) adds `<meta name="apple-itunes-app">` in `Base.astro` (Safari's Smart App Banner) with the page's public URL, without its query, as `app-argument`. Both files must answer 200 with `application/json` and no redirect, so keep them out of any redirect, auth or bot-challenge rule on the domain.

Only compact horizontal post cards (`variant="row"`) omit publication dates and reading time. Featured/grid cards and article headers align reading time to the right on the author-name row, with the publication date directly below the names (no extra vertical gap). Keep publication dates in SEO metadata and the public API.

## Internal ads (`src/lib/ads.ts`, `src/components/AdSlot.astro`)

`getAds()` queries published candidates once and filters positions in memory (multiSelect is JSON-backed; SQL `IN` compares the whole array), then the pure `selectAd()` filters enabled ads, validates HTTP(S) targets and schedules, and picks highest priority (ID ascending breaks ties). Start is inclusive, end exclusive; missing bounds are open-ended and malformed dates fail closed. Home renders below the post list. An article shows at most one visible ad: sidebar at `lg` and up, falling back to bottom when no sidebar ad is eligible; below `lg`, only the bottom placement renders visibly. A sidebar-only campaign is not moved to mobile. The sidebar banner precedes and sits outside the sticky TOC/widget group, so it scrolls naturally. Empty slots render no wrapper. Image frames reserve 3:1 for home/bottom and 6:5 for sidebar; `object-fit: contain` preserves the whole creative even when an uploaded image has a different ratio. The public `/api/v1/ads` endpoint shares this selection with the native app for home/bottom only, returning a 60-second maximum lease capped by the earliest future start/end boundary (including when no ad is active). It uses `no-store`; the app hides expired data and excludes ads from offline persistence. No tracking is provided.

Ad pages register the collection cache hint with `maxAge: 0, swr: 0`: eligibility changes as time passes without a content write, including when no ad is currently eligible. Do not enable long-lived route caching here without accounting for schedule boundaries.

## Push notifications (`src/plugins/push-notifications/`)

A native EmDash plugin (this site has no sandbox runner), registered in `astro.config.mjs` with the Vite root-relative entrypoint `/src/plugins/push-notifications/index.ts`; keep its `id`/`version` there and in `createPlugin()` identical.

- **Devices** live in the plugin's storage collection `devices` (id = Expo push token). The plugin never opens the EmDash database. `/api/v1/devices` validates the body, applies the `DEVICES_RATE_LIMIT` binding (per IP, 20/min, see `wrangler.jsonc`) and calls the plugin's public `register`/`unregister` routes in-process through `locals.emdash.handlePublicPluginApiRoute`, so the API keeps its own envelope.
- **Sending** happens in `content:afterPublish` (manual and scheduled publishes) for the `posts` collection: one Expo request per 100 tokens via `ctx.http` (`allowedHosts: ["exp.host"]`). A KV claim `notified:<content id>` makes it once per post; it is released only when no request reached Expo. Tokens Expo reports as `DeviceNotRegistered` are deleted. The log line `New-post notification` carries the URL and counts.
- **Settings** (admin → Plugins → push-notifications): `enabled` (default on) and `expoAccessToken` (secret, only for Expo's enhanced push security; encrypted with `EMDASH_ENCRYPTION_KEY`).
- Each batch is a subrequest: the Workers subrequest limit per invocation caps the device count (about 100 × the limit). Receipts are not fetched; tokens are pruned from the tickets only.
