# Blog — web & mobile

Monorepo blog dengan konten dari [EmDash](https://emdashcms.com) dan tampilan [HeroUI](https://heroui.com).

```
.
├── apps/
│   ├── web/          Situs Astro + EmDash + HeroUI di Cloudflare Workers (D1 + R2), juga panel admin CMS
│   └── mobile/       (rencana) Aplikasi React Native + HeroUI Native
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
```

Butuh Node.js 22.23.4+ dan pnpm 11. Salin `apps/web/.env.example` ke `apps/web/.env` dan isi `EMDASH_ENCRYPTION_KEY` (`npx emdash secrets generate`). Dev lokal berjalan di workerd dengan D1/R2 lokal; buka `/_emdash/admin` untuk setup pertama.

## Deploy ke Cloudflare

1. Sesuaikan `apps/web/wrangler.jsonc`: `name`, nama D1/R2, `routes` (domain Anda, zonanya harus aktif di Cloudflare) dan `vars.EMDASH_SITE_URL`.
2. `pnpm --filter @blog/web exec wrangler login`
3. `pnpm deploy:web` — deploy pertama membuat database D1, bucket R2 dan record DNS custom domain.
4. `pnpm --filter @blog/web exec wrangler secret put EMDASH_ENCRYPTION_KEY` — pakai kunci baru dari `npx emdash secrets generate` dan simpan cadangannya.
5. **Segera** buka `https://domain-anda/_emdash/admin` dan selesaikan setup: pengunjung pertama yang menyelesaikan wizard menjadi admin. Passkey terikat ke domain, jadi setup harus dilakukan di domain produksi.

## Catatan

- `apps/web/.env`, data lokal (`.wrangler/`) dan build tidak ikut di-commit. Di produksi kunci enkripsi disimpan sebagai secret Worker.
- Aplikasi mobile mengambil konten lewat API publik baca-saja `/api/v1/*` dari `apps/web`, bukan dari API admin EmDash (yang wajib login). Daftar endpoint ada di `apps/web/README.md`.

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

Kategori tanpa entri otomatis memakai ikon folder. Ikon baru di luar daftar `CATEGORY_ICON_KEYS` perlu ditambahkan juga ke `apps/web/src/lib/icons.ts` (dan nanti ke aplikasi mobile).
