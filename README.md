# ui_page_mdp

Minimal README template for the project.

## Ringkasan
- Dashboard konsumsi listrik berbasis Next.js.

## Persyaratan
- Node.js 18+ and npm

## Konfigurasi
1. Salin contoh environment:

```bash
cp .env.example .env.local
# lalu isi .env.local dengan token/URL yang benar
```

Variabel environment penting:
- `INFLUX_URL` — URL InfluxDB
- `INFLUX_TOKEN` — token akses InfluxDB (jangan commit)
- `INFLUX_ORG` — organisasi/namespace Influx

## Skrip berguna
- `npm run dev` — jalankan dev server
- `npm run build` — build produksi
- `npm start` / `next start` — jalankan build produksi
- `npm run lint` — jalankan ESLint
- `npm test` — placeholder (tidak ada test otomatis saat ini)

## CI
Workflow CI (`.github/workflows/ci.yml`) menjalankan lint dan build pada push/PR. Jika Anda menambahkan test yang membutuhkan secrets (mis. `INFLUX_TOKEN`), tambahkan secrets melalui GitHub Settings → Secrets → Actions dan update workflow untuk memetakan `secrets.INFLUX_TOKEN` ke environment variable.
 # ui_page_mdp

Deskripsi singkat
-----------------
`ui_page_mdp` adalah dashboard berbasis Next.js untuk memantau konsumsi listrik. Aplikasi melakukan query ke InfluxDB lalu menyajikan agregasi penggunaan energi dan perhitungan biaya.

Prasyarat
---------
- Node.js 18 atau lebih baru
- npm

Mulai cepat
-----------
1. Salin file contoh environment dan isi nilai sensitif pada `.env.local` (jangan commit nilai sensitif):

```bash
cp .env.example .env.local
# edit .env.local dan atur INFLUX_TOKEN serta variabel lain
```

2. Instal dependensi dan jalankan server pengembangan:

```bash
npm install
npm run dev
```

3. Membangun untuk produksi:

```bash
npm run build
npm start
```

Konfigurasi
-----------
Konfigurasi runtime disimpan di `.env.local`. Variabel utama:

- `INFLUX_URL` — URL InfluxDB (mis. `http://influx.example:8086`)
- `INFLUX_TOKEN` — token akses InfluxDB (rahasia)
- `INFLUX_ORG` — organisasi Influx
- `INFLUX_BUCKET` — nama bucket (mis. `OtomasiEng`)
- `INFLUX_MEASUREMENT` — measurement yang dipakai (mis. `pm2220`)
- `NEXT_PUBLIC_GRAFANA_URL` — URL publik panel Grafana (opsional)

Struktur proyek (file penting)
-----------------------------
- `app/page.js` — UI dashboard (client-side)
- `app/api/listrik/route.js` — API route server untuk query InfluxDB
- `test-query.js` — skrip lokal untuk menguji query InfluxDB (menggunakan env vars)
- `.env.example` — template environment yang aman untuk di-commit
- `.github/workflows/ci.yml` — pipeline CI (lint + build)
- `public/` — aset statis (ikon/logo)

Perintah (scripts)
------------------
- `npm run dev` — jalankan server pengembangan
- `npm run build` — buat build produksi
- `npm start` — jalankan build produksi
- `npm run lint` — jalankan ESLint
- `npm test` — skrip placeholder (tidak ada test otomatis sekarang)

Integrasi Kontinu (CI)
----------------------
Pipeline GitHub Actions menjalankan `lint` dan `build` pada push/PR. Jika menambahkan tes yang memerlukan akses ke InfluxDB, simpan rahasia (mis. `INFLUX_TOKEN`) di GitHub Secrets dan peta ke environment di workflow.

Keamanan
--------
- Jangan commit nilai rahasia. Gunakan `.env.example` sebagai dokumentasi variabel.
- Jika rahasia terlanjur ter-commit, segera rotasi kunci dan hapus dari riwayat git (contoh: `git filter-repo` atau BFG).

Kontribusi
----------
- Buat pull request ke cabang `main`.
- Jalankan `npm run lint` dan `npm run build` sebelum PR.
- Sertakan tes untuk fitur baru bila memungkinkan.

Lisensi
-------
Tambahkan file `LICENSE` untuk menentukan lisensi proyek.

Kontak
------
Buka issue di repositori untuk pertanyaan atau catat kontak maintainer.
