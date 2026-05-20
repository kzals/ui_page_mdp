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

