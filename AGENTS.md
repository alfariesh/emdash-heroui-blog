This repository is a pnpm monorepo for a blog with a web app and a mobile app, both styled with HeroUI. Content is managed in EmDash.

## Layout

| Path              | Package        | What it is                                                                                     |
| ----------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `apps/web`        | `@blog/web`    | Astro + EmDash site with HeroUI v3 (`@heroui/react`) on Cloudflare Workers (D1 + R2). Also hosts the CMS admin and owns the database. See `apps/web/AGENTS.md`. |
| `apps/mobile`     | `@blog/mobile` | Expo SDK 58 (React Native 0.88) reader app with HeroUI Native on Uniwind, Expo Router, TanStack Query and FlashList. Reads `/api/v1` only. See `apps/mobile/AGENTS.md` (code style for the app). |
| `packages/shared` | `@blog/shared` | Framework-agnostic TypeScript used by both apps: dates, reading time, site identity, app-link paths, the push-notification contract (`src/push.ts`), and the public API contract + client (`src/api/`). |

Agent skills for EmDash are in `.agents/skills/` (symlinked from `.claude/skills`). MCP configs (`.mcp.json`, `.cursor/`, `.vscode/`) stay at the repo root.

## Commands (from the repo root)

```bash
pnpm install          # install every workspace
pnpm dev              # start the web app (http://localhost:4321, admin at /_emdash/admin)
pnpm dev:stop         # stop the web dev server (Astro 7 runs it in the background)
pnpm build            # build the web app
pnpm dev:mobile       # start Metro for the mobile app (run `pnpm --filter @blog/web dev --host` for its API)
pnpm deploy:web       # build + wrangler deploy to Cloudflare (needs `wrangler login`)
pnpm typecheck        # type-check every workspace
pnpm test             # unit tests in every workspace that has them
pnpm --filter @blog/web <script>   # run any script in one workspace
```

CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build` and the mobile `export` on every push and on pull requests from forks. Keep it green: it is the same list a change must pass locally.

## Rules

- **Content flows one way: EmDash (in `apps/web`) → web pages and mobile app.** The EmDash REST API (`/_emdash/api/content/...`) requires authentication, and an API token must never ship inside a mobile app. The mobile app reads published content from the public, read-only JSON API at `/api/v1/*` served by `apps/web` (`apps/web/src/pages/api/v1/`), never from the EmDash admin API.
- **The public API contract lives in `packages/shared/src/api/`** (response types, `createBlogClient(baseUrl)`, `parseSnippet`). Endpoints must build their responses with those types; change the contract there first. Breaking changes need a new version prefix (`/api/v2`), because shipped mobile builds keep calling `/api/v1`.
- `packages/shared` must stay framework-agnostic: no imports from `astro`, `emdash`, `react-dom`, `react-native`, and no DOM or Node globals. Workspace packages export TypeScript source directly (`"exports": "./src/index.ts"`), so there is no build step.
- Depend on workspace packages with `"workspace:*"`.
- TypeScript is pinned to 6.x because `astro check` does not support TypeScript 7 yet.
- HeroUI: the web uses `@heroui/react` v3 (Tailwind v4); the mobile app uses HeroUI Native (`heroui-native`, Tailwind v4 through Uniwind). The packages are different, so share design decisions, not component code: both use the logo's ember-orange accent (`--color-ember-orange`, deepened to `--color-ember-deep` in the light theme so text and button labels reach WCAG AA; `packages/shared/src/palette-contrast.test.ts` guards the pairs) and keep the HeroUI default radius, cards are radius-3xl with images inset at radius-2xl, Google Sans is the typeface, and copy is the same English wording. Change a shared decision in both apps.
- Icons: Hugeicons free set everywhere (`@hugeicons/core-free-icons` data; `@hugeicons/react` on web, `@hugeicons/react-native` on mobile). Category icon keys live in `packages/shared/src/category-icons.ts`; each app maps keys to icon objects (`apps/web/src/lib/icons.ts`, `apps/mobile/src/lib/icons.ts`), and a `satisfies` check fails the build when a key is missing. Don't import `@hugeicons/core-free-icons` into `packages/shared`, and on mobile import icons one file each (`@hugeicons/core-free-icons/<Name>`): the root index pulls ~12k modules, which Metro would bundle.
- Visitor-facing text is English (`en-US`); code, comments and agent docs are English.
- Secrets: locally `apps/web/.env` holds `EMDASH_ENCRYPTION_KEY`; in production it is a Worker secret (`wrangler secret put`). Never commit either, and back up the production key.
- Open source: deployment-specific values (Worker/D1/R2 names, custom domain, `EMDASH_SITE_URL`) live only in `apps/web/wrangler.jsonc`; the mobile app's API origin and app identifiers come from environment variables (`apps/mobile/.env`, EAS env: `EXPO_PUBLIC_API_URL`, `APP_ID`…). Keep docs and code domain-neutral (`blog.example.com`, `com.example.blog`).
- `EXPO_PUBLIC_*` variables are inlined into the app bundle and readable by anyone with the app: public values only, never a token.
- Verified app links (blog URLs open the app instead of the browser): the paths live in `APP_LINK_PATH_PREFIXES` (`packages/shared/src/app-links.ts`). `apps/web` serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from the `APP_LINKS_*` vars in `wrangler.jsonc` (empty = 404); `apps/mobile/app.config.ts` registers the same paths for the host of `EXPO_PUBLIC_API_URL` when it is https. A new path needs a screen at the same route in the app.
- Comments: the app reads approved comments through `/api/v1/posts/[slug]/comments` and sends readers to the web form to write one. Posting from the app is a separate decision (it would need its own spam and moderation story).
- Push notifications ("New posts"): opt-in in the app's Settings. The app registers its Expo push token with `POST /api/v1/devices` (`DELETE /api/v1/devices/[token]` to stop); those endpoints forward to the `push-notifications` native EmDash plugin in `apps/web/src/plugins/`, which keeps tokens in its own plugin storage and sends one notification per published post from `content:afterPublish` through the Expo push service. The notification's `data.url` is the post URL, opened like any blog link. Channel id and data shape live in `packages/shared/src/push.ts`.
