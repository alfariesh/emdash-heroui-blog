# Blog — web & mobile

Monorepo blog dengan konten dari [EmDash](https://emdashcms.com) dan tampilan [HeroUI](https://heroui.com).

```
.
├── apps/
│   ├── web/          Situs Astro + EmDash + HeroUI di Cloudflare Workers (D1 + R2), juga panel admin CMS
│   └── mobile/       Aplikasi Expo (React Native) + HeroUI Native, membaca API publik web
├── packages/
│   └── shared/       Kode bersama web & mobile: format tanggal, waktu baca, identitas situs,
│                     kontrak + klien API publik (src/api/)
├── package.json      Skrip root
└── pnpm-workspace.yaml
```

## Menjalankan

```bash
pnpm install
pnpm dev          # situs:  http://localhost:4321
                  # admin:  http://localhost:4321/_emdash/admin
pnpm dev:stop     # hentikan dev server
pnpm typecheck    # cek tipe semua paket
pnpm test         # unit test
```

Butuh Node.js 22.23.4+ dan pnpm 11. Salin `apps/web/.env.example` ke `apps/web/.env` dan isi `EMDASH_ENCRYPTION_KEY` (`npx emdash secrets generate`). Dev lokal berjalan di workerd dengan D1/R2 lokal; buka `/_emdash/admin` untuk setup pertama.

### Aplikasi mobile

```bash
pnpm --filter @blog/web dev --host   # API untuk HP/emulator di jaringan yang sama
pnpm dev:mobile                      # Metro; buka di Expo Go, simulator, atau dev build
```

Tanpa konfigurasi, aplikasi memakai API dari komputer yang menjalankan Metro (port 4321). Untuk server lain, salin `apps/mobile/.env.example` ke `apps/mobile/.env` dan isi `EXPO_PUBLIC_API_URL`. Detail fitur, build, dan rilis ada di `apps/mobile/README.md`.

## Deploy ke Cloudflare

1. Sesuaikan `apps/web/wrangler.jsonc`: `name`, nama D1/R2, `routes` (domain Anda, zonanya harus aktif di Cloudflare) dan `vars.EMDASH_SITE_URL`.
2. `pnpm --filter @blog/web exec wrangler login`
3. `pnpm deploy:web` — deploy pertama membuat database D1, bucket R2 dan record DNS custom domain.
4. `pnpm --filter @blog/web exec wrangler secret put EMDASH_ENCRYPTION_KEY` — pakai kunci baru dari `npx emdash secrets generate` dan simpan cadangannya.
5. **Segera** buka `https://domain-anda/_emdash/admin` dan selesaikan setup: pengunjung pertama yang menyelesaikan wizard menjadi admin. Passkey terikat ke domain, jadi setup harus dilakukan di domain produksi.
6. Opsional: isi `APP_LINKS_*` di `vars` agar tautan tulisan membuka aplikasi mobile (lihat `apps/mobile/README.md`).
7. Opsional: notifikasi push tulisan baru sudah aktif di sisi situs; langkah aplikasi (proyek EAS, Firebase) ada di `apps/mobile/README.md`.

## Catatan

- `apps/web/.env`, data lokal (`.wrangler/`) dan build tidak ikut di-commit. Di produksi kunci enkripsi disimpan sebagai secret Worker.
- Aplikasi mobile mengambil konten lewat API publik baca-saja `/api/v1/*` dari `apps/web`, bukan dari API admin EmDash (yang wajib login). Daftar endpoint ada di `apps/web/README.md`.
- Iklan internal web dikelola melalui collection **Iklan** di CMS. Database yang sudah berjalan memerlukan `setup:ads` sebelum memakai fitur ini; panduan posisi, jadwal, format banner, dan penerapan schema ada di [panduan web](apps/web/README.md#iklan-internal).

## API publik

```ts
import { createBlogClient, formatDate, formatReadingTime } from "@blog/shared";

const api = createBlogClient("http://localhost:4321");
const { data: posts, nextCursor } = await api.getPosts({ limit: 10 });
const post = await api.getPost(posts[0].slug);
```

## Ikon

Semua ikon memakai [Hugeicons](https://hugeicons.com) versi gratis (MIT). Untuk memberi ikon pada kategori baru, tambahkan slug-nya di `packages/shared/src/category-icons.ts`:

```ts
export const CATEGORY_ICONS = {
	pengembangan: "code",
	desain: "design",
	catatan: "note",
	"kategori-baru": "idea", // pilih dari CATEGORY_ICON_KEYS
};
```

Kategori tanpa entri otomatis memakai ikon folder. Ikon baru di luar daftar `CATEGORY_ICON_KEYS` perlu ditambahkan juga ke `apps/web/src/lib/icons.ts` dan `apps/mobile/src/lib/icons.ts` (build gagal bila salah satu terlewat).

## Lisensi

[MIT](LICENSE) © 2026 Salman Alfariesh.

## Kredit

- Kerangka situs dan skill agen di `.agents/skills/` berasal dari [template blog EmDash](https://github.com/emdash-cms/templates) — MIT, © Cloudflare, Inc.
- [EmDash](https://emdashcms.com) dan [Astro](https://astro.build) — MIT.
- [HeroUI](https://heroui.com) (`@heroui/react`, `@heroui/styles`, `heroui-native`) — Apache-2.0.
- [Expo](https://expo.dev), [React Native](https://reactnative.dev), [Uniwind](https://uniwind.dev), [TanStack Query](https://tanstack.com/query), [FlashList](https://shopify.github.io/flash-list/) — MIT.
- Font [Inter](https://rsms.me/inter/) (`@expo-google-fonts/inter`) — SIL Open Font License 1.1.
- [Hugeicons](https://hugeicons.com) versi gratis (`@hugeicons/core-free-icons`, `@hugeicons/react`, `@hugeicons/react-native`) — MIT.
- Foto contoh di `apps/web/seed/seed.json` diunduh dari [Unsplash](https://unsplash.com) saat seeding (Unsplash License) dan tidak disimpan di repo.
