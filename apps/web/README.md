# @blog/web

Situs blog Astro + [EmDash](https://emdashcms.com) dengan tampilan HeroUI v3 (Tailwind CSS v4). Berjalan di Node.js dengan SQLite dan penyimpanan media lokal.

```bash
pnpm dev        # dari folder ini atau dari root repo
```

| Halaman | Rute |
|---|---|
| Beranda | `/` |
| Semua tulisan | `/posts` |
| Detail tulisan | `/posts/:slug` |
| Kategori / tag | `/category/:slug`, `/tag/:slug` |
| Pencarian | `/search` |
| Halaman statis | `/pages/:slug` |
| RSS | `/rss.xml` |
| Admin | `/_emdash/admin` |

## API publik (`/api/v1`)

JSON baca-saja untuk aplikasi mobile. Hanya konten yang sudah terbit; draf selalu 404. Tipe respons dan klien ada di `@blog/shared` (`packages/shared/src/api/`).

| Endpoint | Isi |
|---|---|
| `GET /api/v1/site` | Judul, tagline, logo, item menu `primary` |
| `GET /api/v1/posts?cursor=&limit=&category=&tag=` | Ringkasan tulisan (terbaru dulu) + `nextCursor` |
| `GET /api/v1/posts/:slug` | Detail tulisan + konten Portable Text |
| `GET /api/v1/pages/:slug` | Halaman statis, mis. `tentang` |
| `GET /api/v1/categories`, `GET /api/v1/tags` | Daftar istilah + jumlah tulisan |
| `GET /api/v1/search?q=` | Hasil pencarian tulisan dan halaman |

Format: sukses `{ "ok": true, "data": … }` (daftar juga punya `"nextCursor"`), gagal `{ "ok": false, "error": { "status", "code", "message" } }`. Semua URL gambar absolut, dibangun dari origin request. Cache: `max-age=60, stale-while-revalidate=300`.

```bash
curl http://localhost:4321/api/v1/posts?limit=2
```

Dari emulator Android pakai `http://10.0.2.2:4321`; dari HP fisik pakai IP LAN Mac dan jalankan web agar mendengar di jaringan: `pnpm dev:stop` lalu `pnpm --filter @blog/web dev --host`. Di produksi, set `EMDASH_SITE_URL=https://blog.example.com` saat build dan saat server berjalan; semua URL (API, canonical, RSS) akan memakai domain itu.

## Struktur `src/`

```
src/
├── components/          Komponen Astro (render server, tanpa JS)
│   └── islands/         Komponen React HeroUI yang interaktif (header, pencarian, tema)
├── layouts/Base.astro   Layout utama + wiring EmDash (menu, SEO, widget)
├── lib/                 Helper khusus web (locale, tema, helper API publik)
├── pages/               Rute (semua server-rendered); api/v1/ = API JSON publik
├── styles/global.css    Tailwind v4 + HeroUI + override kecil
└── live.config.ts       Registrasi loader EmDash (jangan diubah)
```

Helper yang juga dipakai mobile ada di `packages/shared` (`@blog/shared`). Panduan teknis lengkap untuk agen AI ada di `AGENTS.md`.
