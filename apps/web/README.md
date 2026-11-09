# @blog/web

Situs blog Astro + [EmDash](https://emdashcms.com) dengan tampilan HeroUI v3 (Tailwind CSS v4). Berjalan di Cloudflare Workers dengan D1 (database) dan R2 (media). Panduan deploy ada di README root.

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
| `GET /api/v1/ads?placement=home\|post_bottom` | One eligible banner or null, with a short-lived schedule lease (`no-store`) |
| `GET /api/v1/site` | Judul, tagline, logo, item menu `primary` |
| `GET /api/v1/posts?cursor=&limit=&category=&tag=` | Ringkasan tulisan (terbaru dulu) + `nextCursor` |
| `GET /api/v1/posts/:slug` | Detail tulisan + konten Portable Text |
| `GET /api/v1/posts/:slug/comments` | Komentar yang sudah disetujui (berutas), untuk dibaca di aplikasi |
| `POST /api/v1/devices`, `DELETE /api/v1/devices/:token` | Daftar/hapus token push aplikasi untuk notifikasi tulisan baru (dibatasi 20 permintaan/menit per IP) |
| `GET /api/v1/pages/:slug` | Halaman statis, mis. `tentang` |
| `GET /api/v1/categories`, `GET /api/v1/tags` | Daftar istilah + jumlah tulisan |
| `GET /api/v1/search?q=` | Hasil pencarian tulisan dan halaman |

Format: sukses `{ "ok": true, "data": … }` (daftar juga punya `"nextCursor"`), gagal `{ "ok": false, "error": { "status", "code", "message" } }`. Semua URL gambar absolut, dibangun dari origin request. Cache: `max-age=60, stale-while-revalidate=300`.

```bash
curl http://localhost:4321/api/v1/posts?limit=2
```

Dari emulator Android pakai `http://10.0.2.2:4321`; dari HP fisik pakai IP LAN Mac dan jalankan web agar mendengar di jaringan: `pnpm dev:stop` lalu `pnpm --filter @blog/web dev --host`. Di produksi, `EMDASH_SITE_URL` diatur di `vars` pada `wrangler.jsonc`; di Workers URL request sudah memakai domain publik, jadi URL di API, canonical dan RSS otomatis benar.

## Tautan aplikasi (Universal Links / App Links)

Agar tautan `https://domain-anda/posts/…` (juga `/pages/…`, `/category/…`, `/tag/…`) terbuka di aplikasi mobile, situs menyajikan dua file verifikasi. Isinya diatur lewat `vars` di `wrangler.jsonc`; bila kosong, file menjawab 404.

| Variabel | Isi |
|---|---|
| `APP_LINKS_IOS_APP_IDS` | `<Team ID>.<bundle id>`, mis. `ABCDE12345.com.example.blog` (boleh beberapa, pisahkan dengan koma) |
| `APP_LINKS_ANDROID_PACKAGE` | Package Android (= `APP_ID` aplikasi), mis. `com.example.blog` |
| `APP_LINKS_ANDROID_SHA256` | Sidik jari SHA-256 sertifikat penanda tangan, `AB:CD:…` (boleh beberapa, pisahkan dengan koma) |
| `APP_LINKS_IOS_STORE_ID` | ID numerik App Store (App Store Connect → App Information → Apple ID). Menampilkan Smart App Banner Safari di semua halaman; tombol "Buka" membuka halaman yang sama di aplikasi |

Setelah `pnpm run deploy`, periksa `https://domain-anda/.well-known/apple-app-site-association` dan `/.well-known/assetlinks.json`: harus 200 dengan JSON. Langkah di sisi aplikasi ada di `apps/mobile/README.md`.

## Notifikasi push

Plugin EmDash `push-notifications` (`src/plugins/push-notifications/`) mengirim satu notifikasi ke aplikasi mobile setiap kali tulisan terbit, baik langsung maupun terjadwal, lewat layanan push Expo. Menerbitkan ulang atau menyunting tulisan yang sudah pernah dikabarkan tidak mengirim lagi.

- Pengaturan ada di admin → **Plugins** → push-notifications: sakelar **Kirim notifikasi tulisan baru** dan **Expo access token** (hanya bila *Enhanced push security* aktif di proyek Expo; disimpan terenkripsi).
- Token perangkat disimpan di storage plugin; token yang sudah tidak berlaku dihapus otomatis.
- Log Worker (`pnpm exec wrangler tail`) mencatat `New-post notification` beserta URL dan jumlah terkirim/gagal.
- `ratelimits` di `wrangler.jsonc` membatasi pendaftaran perangkat; `namespace_id` harus unik di akun Cloudflare Anda.

Langkah di sisi aplikasi (proyek EAS, Firebase) ada di `apps/mobile/README.md`.

## Iklan internal

The **Iklan** collection (`ads`) manages web and native app banners through CMS. New installations get the schema from seed. For an existing database, run once after `pnpm dev`:

```bash
pnpm --filter @blog/web setup:ads
```

Perintah ini menambahkan collection dan field yang belum ada melalui API EmDash, dapat dijalankan ulang, dan tidak mengubah isi iklan. Jika proses terputus, jalankan ulang untuk melanjutkan field yang belum dibuat. Schema yang sudah ada diperiksa sebelum penambahan: tipe field, field wajib, pilihan posisi, dan dukungan draft/revisi harus sesuai. Ketidakcocokan dilaporkan untuk diperbaiki melalui Content Types; pengaturan yang sudah ada tidak ditimpa.

Untuk instance produksi, siapkan `EMDASH_TOKEN` berizin admin di environment, lalu jalankan `pnpm --filter @blog/web setup:ads --url https://blog.example.com`. Target remote wajib HTTPS; gunakan origin tanpa path, query, fragment, atau kredensial URL. Deploy kode web juga diperlukan agar slot muncul. Jangan memasukkan token ke kode atau aplikasi mobile.

Di admin → **Iklan**, buat entri, pilih banner dari media, isi URL lengkap `http://` atau `https://`, pilih posisi, nyalakan **Aktif**, lalu **terbitkan**. Simpan sebagai draf bila belum siap. Perubahan pada iklan yang sudah terbit juga harus diterbitkan agar berlaku, termasuk perubahan sakelar Aktif.

| Posisi | Letak |
|---|---|
| Beranda | Setelah daftar tulisan di beranda |
| Sidebar artikel | Kolom samping artikel, hanya pada layar desktop (mulai 1024px); mengikuti scroll biasa |
| Bawah artikel | Setelah isi dan tag, sebelum komentar; pada desktop menjadi pengganti jika tidak ada iklan sidebar |

**Mulai tayang** dan **Selesai tayang** opsional: kosong berarti tanpa batas pada sisi tersebut. Mulai bersifat inklusif, selesai eksklusif; akhir harus setelah awal. Jadwal diperiksa pada setiap permintaan halaman, sehingga iklan yang sudah terbit dapat mulai/berhenti tanpa cron dan tanpa deploy ulang. Halaman yang sudah terbuka tidak diperbarui otomatis. Untuk input via API, gunakan timestamp dengan zona waktu, misalnya `2026-11-08T09:00:00+07:00` untuk WIB.

Maksimal **satu iklan terlihat per artikel** pada setiap ukuran layar. Desktop mengutamakan sidebar dan memakai slot bawah jika sidebar kosong. Pada layar di bawah 1024px hanya iklan bawah artikel yang ditampilkan; iklan sidebar tidak dipindahkan ke bawah. Banner sidebar berada di luar kelompok sticky daftar isi dan widget, sehingga ikut bergulir bersama halaman.

Frame gambar beranda/bawah artikel memakai rasio **3:1** (siapkan aset **1200 × 400 px**); sidebar memakai **6:5** (siapkan aset **600 × 500 px**). Frame sudah mendapat ruang sejak halaman dirender agar gambar yang dimuat belakangan tidak menggeser tulisan. Gambar dengan rasio berbeda tetap ditampilkan utuh di dalam frame dengan ruang kosong seperlunya. CMS tetap menerima gambar dengan dimensi lain.

The highest **Prioritas** wins within a placement; ID ascending breaks ties. Disabled, draft, expired, malformed or incomplete ads are skipped. Empty slots leave no space. The native app uses Beranda and Bawah artikel only, both 3:1; it refreshes through the public API within 60 seconds or at the next schedule boundary and does not persist ads offline. There is no impression or click tracking.

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
