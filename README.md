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

Overview
--------
`ui_page_mdp` is a Next.js-based dashboard for monitoring electricity consumption. The application queries InfluxDB and presents aggregated energy usage and cost calculations.

Prerequisites
-------------
- Node.js 18 or later
- npm (or compatible package manager)

Quick Start
-----------
1. Copy environment template and populate secrets (do not commit secrets):

```bash
cp .env.example .env.local
# edit .env.local and set INFLUX_TOKEN and other values
```

2. Install dependencies and start development server:

```bash
npm install
npm run dev
```

3. Build for production:

```bash
npm run build
npm start
```

Configuration
-------------
Use `.env.local` to configure runtime values. Key variables used by the application:

- `INFLUX_URL` — InfluxDB base URL (e.g. `http://influx.example:8086`)
- `INFLUX_TOKEN` — API token for InfluxDB (sensitive; store in GitHub Secrets for CI)
- `INFLUX_ORG` — Influx organization
- `INFLUX_BUCKET` — Bucket name used by queries (e.g. `OtomasiEng`)
- `INFLUX_MEASUREMENT` — Measurement name used by queries (e.g. `pm2220`)
- `NEXT_PUBLIC_GRAFANA_URL` — Public Grafana panel URL (optional)

Project structure (important files)
----------------------------------
- `app/page.js` — Client-side dashboard UI
- `app/api/listrik/route.js` — Server route that queries InfluxDB
- `test-query.js` — Local helper to run InfluxDB queries (uses environment variables)
- `.env.example` — Example environment variables (safe to commit)
- `.github/workflows/ci.yml` — CI workflow for lint + build

Scripts
-------
- `npm run dev` — Start development server
- `npm run build` — Build production assets
- `npm start` — Run production server (after `npm run build`)
- `npm run lint` — Run ESLint
- `npm test` — Placeholder test script (no automated tests by default)

Continuous Integration
----------------------
The repository contains a GitHub Actions workflow that runs `lint` and `build` on push and pull requests. If you add tests that require secrets (for example, integration tests that access InfluxDB), add those secrets in GitHub repository settings and update the workflow to expose them as environment variables.

Security and Secrets
--------------------
- Do not commit secret values. Use `.env.example` to document required variables.
- If secrets were accidentally committed, rotate them immediately and remove them from git history with a history-rewriting tool.

Contributing
------------
- Create pull requests against `main`.
- Add tests for new behavior.
- Run `npm run lint` and `npm run build` before opening a PR.

License
-------
Add a `LICENSE` file to indicate project licensing. If unspecified, the repository is considered private.

Contact
-------
For questions about this repository, open an issue or contact the maintainer.
