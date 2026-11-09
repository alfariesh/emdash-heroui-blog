# Blog — web and mobile

A blog monorepo with content from [EmDash](https://emdashcms.com) and a [HeroUI](https://heroui.com) interface.

```
.
├── apps/
│   ├── web/          Astro + EmDash + HeroUI site on Cloudflare Workers (D1 + R2), including the CMS admin
│   └── mobile/       Expo (React Native) + HeroUI Native app that reads the web public API
├── packages/
│   └── shared/       Code shared by web and mobile: date formatting, reading time, site identity,
│                     and the public API contract + client (src/api/)
├── package.json      Root scripts
└── pnpm-workspace.yaml
```

## Run

```bash
pnpm install
pnpm dev          # site:   http://localhost:4321
                  # admin:  http://localhost:4321/_emdash/admin
pnpm dev:stop     # stop the dev server
pnpm typecheck    # type-check every package
pnpm test         # unit tests
```

Requires Node.js 22.23.4+ and pnpm 11. Copy `apps/web/.env.example` to `apps/web/.env` and set `EMDASH_ENCRYPTION_KEY` (`npx emdash secrets generate`). Local dev runs in workerd with local D1/R2; open `/_emdash/admin` for the first-time setup.

### Mobile app

```bash
pnpm --filter @blog/web dev --host   # API for a phone or emulator on the same network
pnpm dev:mobile                      # Metro; open in Expo Go, a simulator, or a dev build
```

With no extra config, the app uses the API on the computer running Metro (port 4321). For another server, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL`. Features, builds, and release steps are in `apps/mobile/README.md`.

## Deploy to Cloudflare

1. Edit `apps/web/wrangler.jsonc`: `name`, D1/R2 names, `routes` (your domain; the zone must be active on Cloudflare) and `vars.EMDASH_SITE_URL`.
2. `pnpm --filter @blog/web exec wrangler login`
3. `pnpm deploy:web` — the first deploy creates the D1 database, the R2 bucket, and the custom-domain DNS record.
4. `pnpm --filter @blog/web exec wrangler secret put EMDASH_ENCRYPTION_KEY` — use a new key from `npx emdash secrets generate` and keep a backup.
5. **Immediately** open `https://your-domain/_emdash/admin` and finish setup: the first visitor who completes the wizard becomes the admin. Passkeys are bound to the domain, so setup has to happen on the production domain.
6. Optional: set `APP_LINKS_*` in `vars` so post links open the mobile app (see `apps/mobile/README.md`).
7. Optional: new-post push notifications are already on for the site; the app steps (EAS project, Firebase) are in `apps/mobile/README.md`.

## Notes

- `apps/web/.env`, local data (`.wrangler/`) and build output are not committed. In production the encryption key is a Worker secret.
- The mobile app loads content through the public read-only API `/api/v1/*` on `apps/web`, not through the EmDash admin API (which requires a login). The endpoint list is in `apps/web/README.md`.
- Web and native app ads share the **Ads** collection in the CMS. Existing databases need `setup:ads`; see the [web guide](apps/web/README.md#internal-ads) for schema, placements and schedules, and the [mobile guide](apps/mobile/README.md#internal-ads) for the 3:1 app banners.

## Public API

```ts
import { createBlogClient, formatDate, formatReadingTime } from "@blog/shared";

const api = createBlogClient("http://localhost:4321");
const { data: posts, nextCursor } = await api.getPosts({ limit: 10 });
const post = await api.getPost(posts[0].slug);
```

## Icons

Every icon uses the free [Hugeicons](https://hugeicons.com) set (MIT). To give a new category an icon, add its slug in `packages/shared/src/category-icons.ts`:

```ts
export const CATEGORY_ICONS = {
	pengembangan: "code",
	desain: "design",
	notes: "note",
	"new-category": "idea", // pick from CATEGORY_ICON_KEYS
};
```

A category with no entry uses the folder icon. An icon key outside `CATEGORY_ICON_KEYS` also has to be added in `apps/web/src/lib/icons.ts` and `apps/mobile/src/lib/icons.ts` (the build fails if either map misses it).

## License

[MIT](LICENSE) © 2026 Salman Alfariesh.

## Credits

- The site frame and the agent skills in `.agents/skills/` come from the [EmDash blog template](https://github.com/emdash-cms/templates) — MIT, © Cloudflare, Inc.
- [EmDash](https://emdashcms.com) and [Astro](https://astro.build) — MIT.
- [HeroUI](https://heroui.com) (`@heroui/react`, `@heroui/styles`, `heroui-native`) — Apache-2.0.
- [Expo](https://expo.dev), [React Native](https://reactnative.dev), [Uniwind](https://uniwind.dev), [TanStack Query](https://tanstack.com/query), [FlashList](https://shopify.github.io/flash-list/) — MIT.
- The [Google Sans](https://fonts.google.com/specimen/Google+Sans) font (`@expo-google-fonts/google-sans` in the app, Google Fonts on the web) — SIL Open Font License 1.1.
- The free [Hugeicons](https://hugeicons.com) set (`@hugeicons/core-free-icons`, `@hugeicons/react`, `@hugeicons/react-native`) — MIT.
- Sample photos in `apps/web/seed/seed.json` are downloaded from [Unsplash](https://unsplash.com) during seeding (Unsplash License) and are not stored in the repo.
