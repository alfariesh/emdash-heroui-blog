This is the web app of the monorepo (`apps/web`): an EmDash site -- a CMS built on Astro with a full admin UI. It is also the content source for the mobile app. See the root `AGENTS.md` for the workspace layout.

## Commands

```bash
pnpm dev              # Start the Astro dev server (run here, or `pnpm dev` from the repo root)
pnpm typecheck        # astro check (needs TypeScript 6; astro check does not support TS 7)
npx emdash types      # Regenerate TypeScript types from a running site
```

`.env` (EMDASH_ENCRYPTION_KEY), `data.db*`, `uploads/` and `.emdash/` live in this folder because Astro and EmDash resolve them from the app root. Never commit `.env`.

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
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

A blog with posts, pages, categories, tags, full-text search, comments, and RSS. The UI is **HeroUI v3** (`@heroui/react` + `@heroui/styles`) on **Tailwind CSS v4**, and all visitor-facing text is in **Indonesian** (dates use `id-ID`; see `src/lib/locale.ts` and `@blog/shared`).

## Pages

| Page        | Path               | What it shows                                                                                   |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| Home        | `/`                | Site title + tagline, category chips, featured post card, "Tulisan Terbaru" grid                |
| All posts   | `/posts`           | Horizontal post cards; cursor pagination                                                        |
| Post detail | `/posts/[slug]`    | Breadcrumbs, title, excerpt, bylines, hero image, body + sticky rail (table of contents, widgets), tags, comments, "Baca Juga" |
| Search      | `/search`          | HeroUI SearchField + FTS results with highlighted matches                                       |
| Page        | `/pages/[slug]`    | Static page content (Portable Text)                                                             |
| Category    | `/category/[slug]` | Card grid of posts in a category                                                                |
| Tag         | `/tag/[slug]`      | Card grid of posts with a tag                                                                   |
| RSS         | `/rss.xml`         | Generated feed                                                                                  |
| Public API  | `/api/v1/*`        | Read-only JSON for the mobile app (see below)                                                   |

## Schema

- `posts` collection: `title`, `featured_image`, `content` (Portable Text), `excerpt` (text).
- `pages` collection: `title`, `content` (Portable Text). Used for `/pages/tentang` etc.
- Taxonomies: `category`, `tag`.
- Single `primary` menu (Beranda, Tulisan, Tentang by default).
- Widget areas: `sidebar` (post rail) and `footer`.

## How HeroUI is wired

- `src/styles/global.css` imports `tailwindcss` then `@heroui/styles` (order matters) and holds the few custom rules: `.container-page`, `.media-frame`, `.article-prose` (extends HeroUI's `.typography-prose`), and overrides for EmDash's widget and comment markup.
- **Astro pages render HeroUI with zero JS** by using the style helpers from `@heroui/styles` (`cardVariants`, `chipVariants`, `buttonVariants`, `avatarVariants`, `breadcrumbsVariants`, `cn`). This keeps EmDash's `<Image>` and `<PortableText>` usable inside HeroUI cards.
- **React islands** (`src/components/islands/`) use `@heroui/react` components where interaction is needed: `SiteHeader` (nav, SearchField, theme toggle, Drawer for mobile), `SearchForm`, `ThemeSwitcher` (ToggleButtonGroup). Don't put compound components (`Card.Header`…) directly in `.astro` files: each tag becomes a separate React root and loses context. Compose them inside a `.tsx` component instead.
- Look up component APIs with the HeroUI MCP (`get_component_docs`) rather than guessing. HeroUI v3 has no Provider, uses `onPress`, and has no v2 tokens like `primary-500`.
- Dark mode: HeroUI reads a `light`/`dark` class on `<html>`. The choice is stored in a `theme` cookie (`src/lib/theme.ts`); with no cookie, the inline script in `Base.astro` follows the OS.
- Icons: **Hugeicons free set** only. Import icon objects from `@hugeicons/core-free-icons` and render them with `<HugeiconsIcon icon={…} />` from `@hugeicons/react` (in `.astro` files too; pass `className`, not `class`). Inside HeroUI buttons the SVG size is set by HeroUI; elsewhere pass `size`. Don't add another icon library.
- Category icons: the slug → icon *key* map is `CATEGORY_ICONS` in `packages/shared/src/category-icons.ts`; `src/lib/icons.ts` maps keys to Hugeicons (`categoryIcon(slug)`), shown on home category chips, post-card category chips, and the category page header. Tags have no icons. EmDash terms have no custom fields, so icons are configured in code, not in the admin.

## Public JSON API (`src/pages/api/v1/`)

Read-only endpoints for the mobile app and other clients. The EmDash admin API (`/_emdash/api/content/...`) needs a login and must not be used by clients.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/site` | `ApiSite`: title, tagline, logo, locale, origin, `primary` menu items |
| `GET /api/v1/posts?cursor=&limit=&category=&tag=` | `ApiPage<ApiPostSummary>`, newest first; `limit` 1–50 (default 10); unknown category/tag → 404 |
| `GET /api/v1/posts/[slug]` | `ApiPost` (summary + `updatedAt` + Portable Text `content`) |
| `GET /api/v1/pages/[slug]` | `ApiPageEntry` |
| `GET /api/v1/categories`, `GET /api/v1/tags` | `ApiTerm[]` with published-post `count` |
| `GET /api/v1/search?q=&cursor=&limit=` | `ApiPage<ApiSearchResult>` over posts and pages |
| anything else under `/api/v1/` | JSON 404 (`[...path].ts`) |

Rules (enforced in `src/lib/public-api.ts`; types come from `@blog/shared`):

- **Published only.** Collection queries pass `status: "published"`; detail endpoints also check `entry.data.status === "published"`, because `getEmDashEntry` can serve drafts in preview/edit mode. The draft `masih-ditulis` must always be 404.
- **Envelope:** `{ ok: true, data }`, lists `{ ok: true, data, nextCursor }`, errors `{ ok: false, error: { status, code, message } }` with Indonesian messages. Bad `limit`/`cursor` → 400 (the live loader re-wraps `InvalidCursorError`, so it is matched by message too).
- **Absolute URLs** for images, avatars, logo, menu items and root-relative links inside Portable Text, built from `context.url.origin`. Portable Text image blocks are rewritten to `{ _type: "image", url, alt, caption, width, height }`.
- **Headers:** `Cache-Control: public, max-age=60, stale-while-revalidate=300` on success, `no-store` on errors, `Access-Control-Allow-Origin: *`.
- **Public origin:** every absolute URL goes through `publicOrigin()` (`src/lib/site-url.ts`): Astro's `site` when set, else the request origin. `astro.config.mjs` sets `site` from `EMDASH_SITE_URL` (production: `https://blog.example.com`), the same variable EmDash uses for passkeys/CSRF/email links. Set it in both the build and the runtime environment. Keep it unset locally so dev passkeys stay on localhost and `10.0.2.2` / LAN IPs keep working.

## Shared code

Framework-agnostic helpers live in `packages/shared` (`@blog/shared`) so the mobile app can reuse them: `formatDate` / `DEFAULT_LOCALE`, `getReadingTime` / `formatReadingTime`, `resolveBlogSiteIdentity`, and the public API contract (`src/api/`: `Api*` types, `createBlogClient`, `parseSnippet`). `src/lib/locale.ts` wraps `formatDate` with the site locale from EmDash. Put new helpers there only if they have no Astro, EmDash, DOM or React Native imports.

## Customisation

- Colours, radius and shadows are HeroUI theme variables. Override them in the `:root` block at the top of `src/styles/global.css` (e.g. `--accent`, `--radius`); use HeroUI tokens in markup (`bg-surface`, `text-muted`, `bg-accent`, `border-separator`, `shadow-surface`).
- Fonts are configured in `astro.config.mjs` under `fonts:` (`--font-body` → Tailwind `font-sans`, `--font-code` → `font-mono`). Don't rename `--font-code` to `--font-mono`; Tailwind owns that name.
- Post cards: `src/components/PostCard.astro` (`card`, `feature`, `row` variants; optional `category` chip with icon + tags). Fetch both with `getPostTerms()` from `src/lib/post-terms.ts` (two batched queries). Bylines: `src/components/Byline.astro`. Page headings: `src/components/PageIntro.astro`.

## What not to do

- Don't hard-code colours (`bg-blue-500`); use HeroUI semantic tokens and variants.
- Don't stack extra shadows on cards (`.card` already has `shadow-surface`).
- Don't add `getStaticPaths()`; all CMS pages are server-rendered.
- Comments are enabled on posts and rendered on the post detail page. Configure moderation before publishing the site, or remove `commentsEnabled` and the comments UI together.
