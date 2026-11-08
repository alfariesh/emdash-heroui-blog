# @blog/mobile

Aplikasi pembaca blog untuk iOS dan Android: [Expo](https://expo.dev) SDK 58 (React Native 0.88), [HeroUI Native](https://heroui.com/docs/native) di atas [Uniwind](https://uniwind.dev) (Tailwind CSS v4), Expo Router, TanStack Query, dan FlashList. Konten diambil dari API publik baca-saja `apps/web` (`/api/v1`), jadi tidak ada token atau rahasia di dalam aplikasi.

## Fitur

| Layar | Isi |
|---|---|
| Beranda | Judul & tagline situs, chip kategori, tulisan unggulan, daftar terbaru dengan scroll tak terbatas dan tarik-untuk-segarkan |
| Jelajah | Kartu kategori (ikon, jumlah tulisan) dan awan tag |
| Cari | Pencarian tulisan & halaman dengan debounce, sorotan hasil, saran tag |
| Tersimpan | Tulisan yang ditandai, tersimpan di perangkat (bisa dibuka offline) |
| Tulisan | Gambar hero parallax, bar atas kaca dengan progres baca, Portable Text native, tag, "Baca Juga", simpan & bagikan |
| Kategori / Tag / Halaman | Arsip per istilah dan halaman statis (mis. Tentang) |
| Pengaturan | Tema (sistem/terang/gelap), halaman dari menu situs, buka situs web, bersihkan cache |

Tautan di dalam konten yang mengarah ke situs sendiri dibuka sebagai layar aplikasi; tautan lain dibuka di browser dalam aplikasi. Feed dan tulisan terakhir disimpan 24 jam sehingga aplikasi tetap bisa dibaca saat offline.

## Menjalankan

```bash
# dari root repo
pnpm --filter @blog/web dev --host   # API (dan admin) di port 4321, terbuka ke jaringan lokal
pnpm dev:mobile                      # Metro; tekan i (iOS), a (Android), atau pindai QR di Expo Go
```

Saat development, alamat API otomatis = komputer yang menjalankan Metro, port 4321. Untuk memakai server lain (mis. produksi), salin `.env.example` ke `.env`:

```bash
EXPO_PUBLIC_API_URL=https://blog.example.com
```

Emulator Android tanpa `--host` di web: pakai `EXPO_PUBLIC_API_URL=http://10.0.2.2:4321`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm start` | Dev server Metro |
| `pnpm typecheck` | Generate tipe (typed routes, Uniwind) lalu `tsc` |
| `pnpm test` | Unit test (test runner bawaan Node) |
| `pnpm export` | Bundle produksi Android + iOS, untuk memastikan Metro/Uniwind/Hermes lolos |
| `pnpm check-deps` | Cek versi modul native terhadap Expo SDK |
| `pnpm web` | Pratinjau di browser (hanya untuk cek cepat; HeroUI Native menargetkan iOS/Android) |

## Build & rilis (EAS)

1. `npm i -g eas-cli && eas login`, lalu `eas init` di folder ini (menambahkan `projectId`).
2. Atur environment variable di EAS untuk `preview` dan `production`: `EXPO_PUBLIC_API_URL` (wajib), serta `APP_NAME`, `APP_ID` (bundle identifier/package), `APP_SCHEME` bila perlu. Lihat `app.config.ts`.
3. `eas build --profile preview` (APK/IPA internal) atau `eas build --profile production`, lalu `eas submit`.

Folder `ios/` dan `android/` tidak di-commit; keduanya dibuat oleh `expo prebuild`/EAS. Ikon dan splash ada di `assets/images/` (PNG biasa, boleh diganti).

## Struktur `src/`

```
src/
├── app/              Rute Expo Router (layar)
├── components/       UI: ui/ (primitif), post/, portable-text/, tab bar, dll.
├── lib/              Data & logika tanpa JSX: API, query, cache, tema, tautan, ikon, tersimpan
└── global.css        Tailwind + Uniwind + HeroUI Native, font Inter
```

Panduan gaya kode untuk agen AI dan kontributor ada di `AGENTS.md`.
