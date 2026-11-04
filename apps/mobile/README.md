# @blog/mobile

Aplikasi pembaca blog untuk iOS dan Android: [Expo](https://expo.dev) SDK 58 (React Native 0.88), [HeroUI Native](https://heroui.com/docs/native) di atas [Uniwind](https://uniwind.dev) (Tailwind CSS v4), Expo Router, TanStack Query, dan FlashList. Konten diambil dari API publik baca-saja `apps/web` (`/api/v1`), jadi tidak ada token atau rahasia di dalam aplikasi.

## Fitur

| Layar | Isi |
|---|---|
| Beranda | Judul & tagline situs, chip kategori, tulisan unggulan, daftar terbaru dengan scroll tak terbatas dan tarik-untuk-segarkan |
| Jelajah | Kartu kategori (ikon, jumlah tulisan) dan awan tag |
| Cari | Pencarian tulisan & halaman dengan debounce, sorotan hasil, saran tag |
| Tersimpan | Tulisan yang ditandai, tersimpan di perangkat (bisa dibuka offline) |
| Tulisan | Gambar hero parallax, bar atas kaca dengan progres baca, Portable Text native, tag, diskusi (baca komentar; menulis lewat formulir web), "Baca Juga", simpan & bagikan |
| Kategori / Tag / Halaman | Arsip per istilah dan halaman statis (mis. Tentang) |
| Pengaturan | Tema (sistem/terang/gelap), halaman dari menu situs, buka situs web, bersihkan cache |

Tautan di dalam konten yang mengarah ke situs sendiri dibuka sebagai layar aplikasi; tautan lain dibuka di browser dalam aplikasi. Tautan tulisan dari luar (chat, email, media sosial) bisa langsung membuka aplikasi, lihat [Tautan aplikasi](#tautan-aplikasi-universal-links--app-links). Feed dan tulisan terakhir disimpan 24 jam sehingga aplikasi tetap bisa dibaca saat offline.

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

### Tautan aplikasi (Universal Links / App Links)

Bila `EXPO_PUBLIC_API_URL` memakai https, build menyertakan Universal Links (iOS, entitlement Associated Domains) dan App Links (Android, intent filter `autoVerify`) untuk `/posts/…`, `/pages/…`, `/category/…` dan `/tag/…` di domain itu. Sistem operasi baru mempercayainya setelah domain menyajikan file verifikasi dari `apps/web`:

1. Isi `vars` di `apps/web/wrangler.jsonc`, lalu `pnpm deploy:web`:
   - `APP_LINKS_IOS_APP_IDS` = `<Team ID>.<APP_ID>`. Team ID ada di Apple Developer → Membership (juga ditampilkan `eas credentials -p ios`).
   - `APP_LINKS_ANDROID_PACKAGE` = `APP_ID`.
   - `APP_LINKS_ANDROID_SHA256` = sidik jari SHA-256 sertifikat penanda tangan, dipisah koma: kunci *App signing* dari halaman Play app signing di Play Console untuk build dari Play Store, dan kunci dari `eas credentials -p android` untuk APK internal.
2. Pastikan `https://domain/.well-known/apple-app-site-association` dan `/.well-known/assetlinks.json` menjawab 200 dengan JSON.
3. Build ulang (`eas build`): entitlement dan intent filter masuk ke build native, jadi pembaruan OTA saja tidak cukup.
4. Setelah aplikasi terbit di App Store, isi juga `APP_LINKS_IOS_STORE_ID` (ID numerik dari App Store Connect): Safari di iPhone lalu menampilkan banner "Buka di aplikasi" di situs.

Cek di Android: `adb shell pm get-app-links <APP_ID>` harus `verified`. Di iOS, uji dengan mengetuk tautan dari Notes atau Messages (mengetik URL di Safari tidak membuka aplikasi); Apple mengambil file lewat CDN-nya, jadi perubahan bisa butuh waktu. Associated Domains butuh akun Apple Developer Program (berbayar); tim personal gratis tidak bisa menandatangani build dengan entitlement ini.

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
