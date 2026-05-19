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

## Kontribusi
- Tambahkan `CONTRIBUTING.md` jika perlu.

## Lisensi
Tambahkan file `LICENSE` jika ingin membuka lisensi publik.
# UI Page MDP

Simple real-time monitoring dashboard with Next.js App Router + Tailwind CSS.

## Features

- Real-time polling every 5 seconds from `/api/listrik`
- InfluxDB integration via `@influxdata/influxdb-client`
- Auto cost calculation in IDR (Rupiah)
- 2-column layout with Grafana embed panel

## Project Structure

- `app/page.js`: Main dashboard UI (`use client`)
- `app/api/listrik/route.js`: API route to query latest kWh from InfluxDB
- `.env.local`: Environment variables for InfluxDB connection

## Environment Variables

Required keys:

- `INFLUX_URL`
- `INFLUX_TOKEN`
- `INFLUX_ORG`
- `INFLUX_BUCKET`
- `INFLUX_MEASUREMENT`

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validate

```bash
npm run lint
```
