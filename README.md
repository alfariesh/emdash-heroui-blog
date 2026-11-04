# Blog — web & mobile

Monorepo blog dengan konten dari [EmDash](https://emdashcms.com) dan tampilan [HeroUI](https://heroui.com).

```
.
├── apps/
│   ├── web/          Situs Astro + EmDash + HeroUI (juga panel admin CMS)
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

Butuh Node.js 22.23.4+ dan pnpm 11.

## Catatan

- Database lokal (`apps/web/data.db`), media (`apps/web/uploads/`) dan kunci enkripsi (`apps/web/.env`) tidak ikut di-commit. Cadangkan `.env` sebelum deploy.
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
