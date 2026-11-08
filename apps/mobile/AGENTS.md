This is the mobile app of the monorepo (`apps/mobile`, `@blog/mobile`): a React Native reader for the blog, built with **Expo SDK 58** (React Native 0.88, React 19.3, New Architecture, React Compiler on), **Expo Router** (typed routes), **HeroUI Native** on **Uniwind** (Tailwind CSS v4 for RN), **TanStack Query** and **FlashList v2**. It reads published content from the web app's public API (`/api/v1`, contract in `@blog/shared`). See the root `AGENTS.md` for the workspace rules; this file is the code style every session must follow in `apps/mobile`.

## Commands (from `apps/mobile`, or `pnpm --filter @blog/mobile <script>` from the root)

```bash
pnpm start          # Metro + Expo dev server (Expo Go or a dev build)
pnpm typecheck      # typegen (typed routes + Uniwind types), then tsc
pnpm test           # unit tests: Node's built-in runner on src/**/*.test.ts
pnpm export         # production JS bundles for Android + iOS (catches Metro/Uniwind errors)
pnpm check-deps     # expo install --check: native module versions vs. SDK 58
```

Before finishing a change: `pnpm typecheck`, `pnpm test`, and `pnpm export` (it is the only check that runs Metro, Uniwind's CSS compiler and Hermes). Add native modules with `pnpm expo install <pkg>` so versions match the SDK. The workspace has a 24 h release-age cooldown (`minimumReleaseAge` in `pnpm-workspace.yaml`), so `check-deps` may list patch releases younger than a day; that is expected, the `~` ranges pick them up later.

API origin: `EXPO_PUBLIC_API_URL` (see `.env.example`). In development it may stay unset: `src/lib/config.ts` falls back to the Metro host on port 4321, so `pnpm --filter @blog/web dev --host` plus `pnpm start` works on simulators and phones on the same network.

## Layout

```
src/
├── app/                    Expo Router routes (files = screens; default export only here)
│   ├── _layout.tsx         Root: fonts, splash, providers, native stack
│   ├── (tabs)/             Floating tab bar: index (Beranda), explore, search, saved
│   ├── posts/[slug].tsx    Article: parallax hero, glass top bar, reading progress, resume offer, #komentar
│   ├── category/[slug].tsx, tag/[slug].tsx, pages/[slug].tsx, settings.tsx, +not-found.tsx
├── components/
│   ├── ui/                 App primitives on top of HeroUI (Icon, Image, StateView, ScreenHeader, GlassIconButton)
│   ├── post/               Post cards, list, byline, meta, chips, article top bar
│   ├── portable-text/      Native Portable Text renderer (no WebView, no HTML)
│   └── …                   Screen-level pieces (tab-bar, category-rail, term-header, navigation theme)
├── lib/                    No JSX: config, api client, queries, query client, storage, theme, links, icons, bookmarks, reading progress, notifications
└── global.css              Tailwind + Uniwind + HeroUI Native imports, font tokens
```

Put code where its kind lives: data and side effects in `lib/`, presentational pieces in `components/`, composition and route params in `app/`. A component used by one screen may live next to it inside that screen file until a second screen needs it.

## Code style

- **Formatting:** tabs, double quotes, semicolons, trailing commas, ~110 columns (same as `apps/web` and `packages/shared`).
- **Files:** kebab-case (`post-card.tsx`, `use-open-link.ts`). Platform variants as `name.web.ts` / `name.ios.tsx` beside the default.
- **Exports:** named exports everywhere; `export default` only for route components in `src/app`. No barrel `index.ts` files.
- **Imports:** packages first, then `@/` aliases, then relative, each group alphabetical. Type-only imports use `import type` / inline `type` (`verbatimModuleSyntax` is on). Use the `@/` alias across folders, relative paths inside a folder.
- **TypeScript:** `strict` + `noUncheckedIndexedAccess`. No `any`; narrow `unknown` with small guards (`str()`, `isTextBlock()`). No Node globals in app code (`"types": []`); a test opts in with `/// <reference types="node" />`.
- **Components:** function components with a props `interface` named `<Component>Props` (inline object type only for tiny private helpers). Destructure props with defaults in the signature. Return `null` early for empty data. Conditional JSX as `cond ? <X /> : null`, never `cond && <X />` with a value that may be `0` or `""`.
- **Comments:** English, explain *why* (a platform quirk, a contract rule, a perf reason), one short doc comment on every exported function/component. Don't narrate what the code does.
- **Copy:** every visitor-facing string, accessibility label and hint is Indonesian (`id-ID`), matching the web's wording ("Tulisan Terbaru", "Baca Juga", "Coba lagi"). Code, comments and docs are English.

## HeroUI Native + Uniwind

- **HeroUI first.** Build from HeroUI Native components (`Button`, `Card`, `Chip`, `Surface`, `ListGroup`, `SearchField`, `Skeleton`, `Spinner`, `Avatar`, `Typography`, `Separator`, `PressableFeedback`, `GlassView`, `useToast`) before writing a primitive. Look APIs up in the installed types (`node_modules/heroui-native/lib/typescript`) or https://heroui.com/native/llms.txt — don't guess.
- **Granular imports only:** `import { Button } from "heroui-native/button"`, `cn` from `heroui-native/utils`, `useThemeColor` from `heroui-native/hooks`, the provider from `heroui-native/provider`. A single `from "heroui-native"` import pulls the whole library into the bundle.
- **Compound parts:** compose `Card.Body`, `Button.Label`, `Chip.Label`, `ListGroup.ItemTitle`… Text styles (`text-*`, `font-*`, colour) go on the text part, never only on a `View`/`Pressable` root: RN text does not inherit from views.
- **Tokens, not colours:** `bg-background`, `bg-surface`, `bg-surface-secondary`, `bg-default`, `bg-accent`, `bg-accent-soft`, `text-foreground`, `text-muted`, `text-accent`, `border-border`, `border-separator`, `shadow-surface`/`shadow-overlay`. Never `gray-*`, hex values or `dark:` variants: the same tokens resolve per theme. Opacity modifiers (`text-foreground/90`) are fine.
- **Where JS needs a colour** (React Navigation theme, `RefreshControl.tintColor`), read it with `useThemeColor("accent")`. Branch on `useUniwind().theme` only for native APIs that take a mode (status bar style).
- **Merge classes with `cn()`**; build variants with static strings (Tailwind must see whole class names: no `` `text-${tone}` ``).
- **Shape and depth:** cards are `Card` (radius-3xl, `shadow-surface`); images inset inside a card use `p-2` on the card and `rounded-2xl` on the image so corners stay concentric (same as the web). Pills and chips are `rounded-full`. Don't stack extra shadows on HeroUI surfaces.
- **Spacing:** screen gutters `px-4` for lists/cards, `px-5` for running text and headers; vertical rhythm with `gap-*` on the parent rather than margins on children; list separators are 12 px (`h-3`).
- **Typography:** `Typography` / `Typography.Heading` / `Typography.Paragraph` with `type`, `color`, `weight`. Inter is loaded per face and mapped by `--font-normal|medium|semibold|bold` in `global.css`, so `font-semibold` selects `Inter_600SemiBold`. Italic and monospace are font families, not weights: set them with `style={{ fontFamily }}` (see `portable-text/text-block.tsx`). Article body is 17/30 px; titles use `tracking-tight`; numbers in metadata use `tabular-nums`.
- **Third-party components** don't take `className` unless wrapped: wrap once at module level with `withUniwind` (see `ui/image.tsx`, `ui/icon.tsx`) or pass `style` (e.g. `LinearGradient`).
- **Icons:** Hugeicons free set only, rendered with `<Icon icon={…} tone="muted" />` (`components/ui/icon.tsx`). Import icon data from `@/lib/icons`, which deep-imports one file per icon (`@hugeicons/core-free-icons/<Name>`); never import the package root (~12k modules). Category icons come from `categoryIcon(slug, apiKey)`; the key map must match `CATEGORY_ICON_KEYS` (the `satisfies` check enforces it).
- **Glass:** floating chrome (tab bar, article top bar, buttons over photos) uses HeroUI `GlassView` (blur on iOS, opaque surface on Android). Content layered above an absolute background goes inside a `View` so it stays on top on every renderer.

## Data

- **Only the public API**, through `api` (`lib/api.ts`, `createBlogClient` from `@blog/shared`). Never `fetch` directly from a component and never call `/_emdash/api/…`. A new field or endpoint starts in `packages/shared/src/api/` (contract first), then `apps/web`, then here.
- **Queries live in `lib/queries.ts`** as `queryOptions` / `infiniteQueryOptions` factories (`postsQuery(filter)`, `postQuery(slug)`, …); screens call `useQuery(postQuery(slug))`. Keys are hierarchical (`["posts", "list", filter]`, `["posts", "detail", slug]`), always pass `signal` to the client, and pick `staleTime` per resource (site/pages 10 min, terms 5 min, posts default 1 min = the API's `max-age`).
- **Instant navigation:** prefetch on `onPressIn` (`prefetchPost`) and paint detail screens from cached summaries with `placeholderData` (`findCachedSummary`); show a skeleton only for the part still missing.
- **States:** every query UI handles pending (skeleton with the final layout's footprint), paused-offline (`fetchStatus === "paused"`), error (`ErrorView` with retry; 404 → "Tidak ditemukan"), empty (`StateView`) and end-of-list. Pull-to-refresh shows the spinner only for a manual refresh.
- **Persistence:** the query cache is persisted to SQLite for 24 h (`lib/query-client.ts`) so the app opens offline on the last feed; search is excluded. Bump nothing by hand: the buster is the API prefix + app version.
- **Local state:** small device-only data (theme, bookmarks) uses `storage` (`lib/storage.ts`: expo-sqlite kv-store with a sync API, localStorage on web) behind a tiny external store + `useSyncExternalStore` (see `lib/theme.ts`, `lib/bookmarks.ts`). No React context for global state, no other storage library. Reading positions (`lib/reading-progress.ts`) have no live subscribers, so they are plain sync reads/writes.
- **"Lanjutkan membaca":** `useReadingPosition()` (`lib/use-reading-position.ts`) saves the article's scroll offset when the screen closes or the app leaves the foreground (never per scroll frame), as progress through the body only. The rules are pure and unit-tested in `lib/reading-positions.ts`: under 5 % or from 95 % the entry is dropped, at most 50 are kept. Coming back to a half-read article shows the `ResumeReading` glass pill for 10 s.

## Navigation and links

- Typed routes: navigate with object hrefs, `router.push({ pathname: "/posts/[slug]", params: { slug } })`. Read params with `useLocalSearchParams<{ slug: string }>()`.
- Screens set dynamic titles with `<Stack.Screen options={{ title }} />`. Header styling comes from `useStackScreenOptions()`; the article screen draws its own bar.
- Links inside content go through `useOpenLink()` → `toAppHref()` (`lib/links.ts`): blog URLs open the matching screen, other http(s) URLs the in-app browser. When `apps/web` gains a route the app also shows, add it to `ROUTES` there.
- Links from outside the app (verified Universal Links / App Links) need no code: Expo Router strips the origin and routes the path, because the app's routes mirror the web's. `app.config.ts` registers `APP_LINK_PATH_PREFIXES` (`@blog/shared`, imported by relative path because the config loader runs outside Metro) for the host of `EXPO_PUBLIC_API_URL` when it is https; the web serves the matching verification files. A new prefix needs a screen at the same path.
- Tab screens leave `useTabBarInset()` of bottom padding (the tab bar floats over content); stack screens use the bottom safe-area inset. Top insets come from `useSafeAreaInsets()`; HeroUI's provider also feeds Uniwind's `pt-safe`-style classes.

## Comments

`components/post/post-comments.tsx` shows approved comments under the article (`postCommentsQuery`, after the body has loaded): threads with one level of replies, a "Penulis" chip for site members, bare URLs made tappable with `splitLinks()` (`lib/text.ts`), the first 5 threads and then "Tampilkan N komentar lainnya". The app does not post comments: "Tulis komentar" opens the web form (`<post url>#komentar`) in the in-app browser. A link to `…/posts/<slug>#komentar` opens the article scrolled to the card: Expo Router passes the fragment as the `"#"` param, and the scroll is retried for 3 s while the content below still loads (it would be clamped otherwise), unless the reader drags first. The card disappears when the API reports `enabled: false`.

## Push notifications

`lib/notifications.ts` owns everything device-side: the opt-in preference (`storage` + `useSyncExternalStore`), `pushUnavailableReason()` (web, simulator, or no `EAS_PROJECT_ID` in the build), permission, the Android channel (`NEW_POSTS_CHANNEL_ID`, created before asking, as Android 13 requires), the Expo push token and `api.registerDevice()` / `api.unregisterDevice()`. Nothing prompts until the reader turns on "Tulisan baru" in Pengaturan. `syncPushRegistration()` runs on each launch (root layout): it retries a pending unregister and re-registers when the token changed or after 7 days. `configureNotifications()` shows notifications in the foreground; `useNotificationNavigation()` (root stack) opens `data.url` from a tapped notification through `useOpenLink()`, on cold start too. Push needs a development or store build on a physical device; Expo Go and simulators get no token.

## Portable Text

`components/portable-text/` renders the API's Portable Text natively. Text blocks → `text-block.tsx` (styles h1–h6/blockquote, marks strong/em/code/underline/strike/link); lists are nested by `groupBlocks()` (pure, unit-tested); object blocks → `object-blocks.tsx` (image, gallery, code, break, pullquote, button(s), columns). Blocks the app cannot draw (video, iframe, htmlBlock, table, embed, cover) render a `WebOnlyBlock` card that opens the web page; unknown plugin types render nothing. To support a new block, add a `case` in `ObjectBlock`, reading fields defensively.

## Performance rules

- **React Compiler is on:** write plain components; don't add `useMemo`/`useCallback`/`memo` by default. Keep render pure (no mutation of props/state, no reads of refs during render).
- **Lists:** `FlashList` (v2, no size estimates) for anything that can grow, with `keyExtractor`, `getItemType` when rows differ, and stable separators. `ScrollView` only for short, bounded content.
- **Animation on the UI thread:** Reanimated shared values with `.get()`/`.set()`, `useScrollOffset`, `useDerivedValue`, `useAnimatedStyle`; reach JS only on threshold changes (`useAnimatedReaction` + `scheduleOnRN`). Never drive animation from a JS `onScroll`. Respect `useReducedMotion()`.
- **Images:** always the `Image` wrapper (expo-image: disk cache, decode at display size, fade); `recyclingKey` inside lists; `priority="high"` only for the first visible hero.
- **Bundle:** deep imports for icons and fonts (one `@expo-google-fonts/inter/<face>` subpath per face; the package root bundles all 18 files), granular HeroUI imports. After adding a dependency, check `pnpm export` output size.
- **Tabs** are `freezeOnBlur`: inactive tabs keep state but don't re-render.

## Accessibility

Pressables get `accessibilityRole` (`link` for navigation, `button`, `tab`, `radio`) and an Indonesian `accessibilityLabel` when the visible text is not enough; selection uses `accessibilityState`. Decorative icons are hidden (the `Icon` wrapper does this). Font scaling stays on (HeroUI provider caps it at 1.6×); avoid fixed heights around text. Never convey state by colour alone.

## Adding a screen (checklist)

1. Route file in `src/app/…` with a default export; register static options in the nearest `_layout.tsx` if needed.
2. Data through a factory in `lib/queries.ts`; all states handled (see Data).
3. HeroUI components + tokens; Indonesian copy; safe-area / tab-bar insets.
4. If the web has the same page, map its URL in `lib/links.ts`.
5. `pnpm typecheck && pnpm test && pnpm export`. For a quick visual check, `pnpm web` renders a preview, but HeroUI Native targets iOS/Android: confirm on a simulator or device before calling UI work done.
