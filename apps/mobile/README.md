# @blog/mobile

A blog reader for iOS and Android: [Expo](https://expo.dev) SDK 58 (React Native 0.88), [HeroUI Native](https://heroui.com/docs/native) on [Uniwind](https://uniwind.dev) (Tailwind CSS v4), Expo Router, TanStack Query, and FlashList. Content comes from the read-only public API in `apps/web` (`/api/v1`), so the app ships no token or secret.

## Features

| Screen | What it shows |
|---|---|
| Home | Site title and tagline, category chips, a featured post, and the latest list with infinite scroll and pull to refresh |
| Explore | Category cards (icon, post count) and a tag cloud |
| Search | Debounced search across posts and pages, highlighted matches, tag suggestions |
| Saved | Bookmarked posts, stored on the device (readable offline) |
| Post | Parallax hero image, a progressive-blur top bar, a back-to-top button with a reading-progress ring, native Portable Text, tags, discussion (read comments; write through the web form), "Read next", save and share, and a "Continue reading" offer when an unfinished post is opened again |
| Category / Tag / Page | An archive for one term, and static pages (for example About) |
| Settings | Theme (system/light/dark), new-post notifications (opt-in), pages from the site menu, open the website, clear the cache |

A link inside content that points at this site opens as an app screen; other links open in the in-app browser. A post link from outside the app (chat, email, social) can open the app directly, and a link that ends in `#comments` jumps to the discussion; see [App links](#app-links-universal-links--app-links). The feed and the latest posts are kept for 24 hours so the app can still be read offline.

## Internal ads

The app reads CMS-managed ads from `GET /api/v1/ads?placement=home|post_bottom`, without an admin token. Deploy the updated web API before releasing the mobile build; no additional CMS fields are needed if the `ads` collection is already installed (a database set up from the Indonesian seed keeps its original placement options, which are still accepted).

Both placements use a **3:1** frame (recommended asset: **1200 × 400 px**). Home shows a banner after the last feed page; articles show at most one banner after the content and tags, before comments. Sidebar campaigns remain web-only. Images are contained without cropping, labeled "Ad", and links use the usual app/browser routing.

Schedules, priority and the enabled switch remain in the CMS. Selections refresh within 60 seconds or at the next schedule boundary. Expired, unavailable and failed-image banners leave no empty space. Ads are excluded from the offline cache; there is no impression or click tracking.

## Run

```bash
# from the repo root
pnpm --filter @blog/web dev --host   # API (and admin) on port 4321, open to the local network
pnpm dev:mobile                      # Metro; press i (iOS), a (Android), or scan the QR code in Expo Go
```

During development, the API address is the computer running Metro, port 4321. To use another server (for example production), copy `.env.example` to `.env`:

```bash
EXPO_PUBLIC_API_URL=https://blog.example.com
```

An Android emulator without `--host` on the web app: use `EXPO_PUBLIC_API_URL=http://10.0.2.2:4321`.

## Commands

| Command | What it does |
|---|---|
| `pnpm start` | Metro dev server |
| `pnpm typecheck` | Generate types (typed routes, Uniwind) then `tsc` |
| `pnpm test` | Unit tests (Node's built-in test runner) |
| `pnpm export` | Production Android + iOS bundles, to confirm Metro/Uniwind/Hermes succeed |
| `pnpm check-deps` | Check native module versions against the Expo SDK |
| `pnpm web` | Browser preview (a quick check only; HeroUI Native targets iOS/Android) |

## Build and release (EAS)

1. `npm i -g eas-cli && eas login`, then `eas init` in this folder (adds `projectId`).
2. Set EAS environment variables for `preview` and `production`: `EXPO_PUBLIC_API_URL` (required), plus `APP_NAME`, `APP_ID` (bundle identifier/package), and `APP_SCHEME` when you need it. See `app.config.ts`.
3. `eas build --profile preview` (internal APK/IPA) or `eas build --profile production`, then `eas submit`.

### App links (Universal Links / App Links)

When `EXPO_PUBLIC_API_URL` uses https, the build includes Universal Links (iOS, Associated Domains entitlement) and App Links (Android, `autoVerify` intent filter) for `/posts/…`, `/pages/…`, `/category/…` and `/tag/…` on that domain. The operating system trusts them only after the domain serves the verification files from `apps/web`:

1. Fill `vars` in `apps/web/wrangler.jsonc`, then `pnpm deploy:web`:
   - `APP_LINKS_IOS_APP_IDS` = `<Team ID>.<APP_ID>`. The Team ID is in Apple Developer → Membership (`eas credentials -p ios` shows it too).
   - `APP_LINKS_ANDROID_PACKAGE` = `APP_ID`.
   - `APP_LINKS_ANDROID_SHA256` = SHA-256 fingerprints of the signing certificates, comma-separated: the *App signing* key from the Play app signing page in Play Console for Play Store builds, and the key from `eas credentials -p android` for an internal APK.
2. Confirm `https://domain/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` answer 200 with JSON.
3. Build again (`eas build`): the entitlement and intent filter are part of the native build, so an OTA update alone is not enough.
4. After the app is on the App Store, also set `APP_LINKS_IOS_STORE_ID` (the numeric ID from App Store Connect): Safari on iPhone then shows an "Open in the app" banner on the site.

Check on Android: `adb shell pm get-app-links <APP_ID>` must say `verified`. On iOS, test by tapping a link from Notes or Messages (typing the URL in Safari does not open the app); Apple fetches the file through its CDN, so a change can take a while. Associated Domains needs a paid Apple Developer Program account; a free personal team cannot sign a build with this entitlement.

### Push notifications (new posts)

Readers turn this on in **Settings → Notifications → New posts**; the app asks for permission only then. The server sends through the Expo push service (the `push-notifications` plugin in `apps/web`), and tapping the notification opens the post.

1. `eas init` to create the EAS project, then set `EAS_PROJECT_ID` (the project ID it prints) as an EAS environment variable and in the local `.env`. Without it the switch in Settings stays off.
2. iOS: no extra step; `eas build` creates the APNs key and turns on the Push Notifications capability.
3. Android: create a Firebase project with package = `APP_ID`, download `google-services.json`, store it as an EAS *file* environment variable named `GOOGLE_SERVICES_JSON`, then upload the FCM V1 service-account key with `eas credentials -p android`.
4. Optional: if *Enhanced push security* is on for the Expo project, set the **Expo access token** in the site admin (Plugins → push-notifications).
5. Build again (`eas build`). Notifications can only be tested on a physical device with a development build or a release build; Expo Go and the simulator do not receive a push token.

The `ios/` and `android/` folders are not committed; `expo prebuild` / EAS creates them. The icon and splash live in `assets/images/` (plain PNGs; you can replace them).

## `src/` layout

```
src/
├── app/              Expo Router routes (screens)
├── components/       UI: ui/ (primitives), post/, portable-text/, tab bar, and the rest
├── lib/              Data and logic without JSX: API, queries, cache, theme, links, icons, saved posts
└── global.css        Tailwind + Uniwind + HeroUI Native, Google Sans font
```

The code-style guide for AI agents and contributors is in `AGENTS.md`.
