This repository is a pnpm monorepo for a blog with a web app and a mobile app, both styled with HeroUI. Content is managed in EmDash.

## Layout

| Path              | Package        | What it is                                                                                     |
| ----------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `apps/web`        | `@blog/web`    | Astro + EmDash site with HeroUI v3 (`@heroui/react`). Also hosts the CMS admin and owns the database. See `apps/web/AGENTS.md`. |
| `apps/mobile`     | `@blog/mobile` | Planned: React Native (Expo) app with HeroUI Native. Not created yet.                          |
| `packages/shared` | `@blog/shared` | Framework-agnostic TypeScript used by both apps: dates, reading time, site identity, and the public API contract + client (`src/api/`). |

Agent skills for EmDash are in `.agents/skills/` (symlinked from `.claude/skills`). MCP configs (`.mcp.json`, `.cursor/`, `.vscode/`) stay at the repo root.

## Commands (from the repo root)

```bash
pnpm install          # install every workspace
pnpm dev              # start the web app (http://localhost:4321, admin at /_emdash/admin)
pnpm dev:stop         # stop the web dev server (Astro 7 runs it in the background)
pnpm build            # build the web app
pnpm typecheck        # type-check every workspace
pnpm --filter @blog/web <script>   # run any script in one workspace
```

## Rules

- **Content flows one way: EmDash (in `apps/web`) → web pages and mobile app.** The EmDash REST API (`/_emdash/api/content/...`) requires authentication, and an API token must never ship inside a mobile app. The mobile app reads published content from the public, read-only JSON API at `/api/v1/*` served by `apps/web` (`apps/web/src/pages/api/v1/`), never from the EmDash admin API.
- **The public API contract lives in `packages/shared/src/api/`** (response types, `createBlogClient(baseUrl)`, `parseSnippet`). Endpoints must build their responses with those types; change the contract there first. Breaking changes need a new version prefix (`/api/v2`), because shipped mobile builds keep calling `/api/v1`.
- `packages/shared` must stay framework-agnostic: no imports from `astro`, `emdash`, `react-dom`, `react-native`, and no DOM or Node globals. Workspace packages export TypeScript source directly (`"exports": "./src/index.ts"`), so there is no build step.
- Depend on workspace packages with `"workspace:*"`.
- TypeScript is pinned to 6.x because `astro check` does not support TypeScript 7 yet.
- HeroUI: the web uses `@heroui/react` v3 (Tailwind v4). The mobile app should use HeroUI Native. The packages are different, so share design decisions (accent colour, radius, Indonesian copy), not component code.
- Icons: Hugeicons free set everywhere (`@hugeicons/core-free-icons` data; `@hugeicons/react` on web, `@hugeicons/react-native` on mobile). Category icon keys live in `packages/shared/src/category-icons.ts`; each app maps keys to icon objects. Don't import `@hugeicons/core-free-icons` into `packages/shared`: its root index pulls ~12k modules, which Metro would bundle.
- Visitor-facing text is Indonesian (`id-ID`); code, comments and agent docs are English.
- Secrets: `apps/web/.env` holds `EMDASH_ENCRYPTION_KEY`. Never commit it, and back it up before deploying.
