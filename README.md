# RESEARCH @ IITB - Dynamic Research Portal

A full web portal rendering the entire "RESEARCH @ IITB" report with interactive charts.
All charts and tables read live from a backend data file, so any figure can be updated later
without touching code.

## Running locally

**Prerequisites:** [Node.js](https://nodejs.org) 18+ and Git.

```bash
# 1. Clone the repository
git clone https://github.com/zubairalmamoon2006-dev/Research-IITB.git
cd Research-IITB

# 2. Install dependencies (backend + frontend)
npm run install-all

# 3. Build the frontend into frontend/dist
npm run build

# 4. Start the portal (API + website on port 5000)
npm start
```

Open **http://localhost:5000** in your browser.

> **Note:** the professor search embeddings (`frontend/public/data/professor-embeddings.json`)
> ship with the repo. After editing professor records (Admin page or `backend/data/report.json`)
> run `npm run embed` and then `npm run build` to regenerate and publish them so neural semantic
> search stays in sync - otherwise semantic ranking disables itself automatically (keyword search
> always keeps working). The first `npm run embed` downloads a ~23 MB embedding model (cached after).

### Development mode (hot reload)

```bash
npm run dev:backend    # API on http://localhost:5000
npm run dev:frontend   # Vite dev server on http://localhost:3000
```

Work on code in `frontend/src` and reload. Edits to `backend/data/report.json` show up on
page refresh - no restart needed (the API re-reads the file on every request).

### Admin access

Writes through the **Update Data** page (`/admin`) require an admin token. On first start
the backend creates `backend/.admin-token` and prints it in the server console; paste it
into the **Admin access** card at the top of `/admin` (see *Updating data* below).

If port 5000 is already in use, stop the other process first:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Pages

| Route | Content |
|---|---|
| `/` | Executive overview, KPIs, publication mix, collaboration donut, recommendations |
| `/impact` | Department citations vs Crossref, faculty size vs citations, access models, open-access citation advantage, institute citations |
| `/excellence` | Volume vs voice (bar+line), H-index vs QS, department-wise H-index across 6 institutes, QS/NIRF table |
| `/publications` | Publication mix, publications & patents by institute, academic-rank pie, authorship distribution, author-count trends, Lorenz curve + concentration pie |
| `/topics` | Yearly key research topics (word cloud, 2020-2024) and top funded topics (radar) with year tabs |
| `/collaborations` | Collaboration split donut, domestic network, global partners, country treemap |
| `/funding` | Funded research by department (pie), top funding agencies (bars) |
| `/professors` | Searchable professor research database (links to iitb.irins.org): hybrid keyword + neural semantic ranking (RRF-fused), URL-synced filters, starred list, CSV export, side-by-side compare (max 3) |
| `/departments` | All departments from the professor database as clickable profile cards |
| `/department/:name` | Per-department profile: faculty, top topics, matched citations / publications / h-index / funding stats |
| `/timeline` | Five-year story: one node per year (key topics, funding mix, author mix, summary) plus a "Now" node |
| `/admin` | **Update Data** - edit any report section as JSON with explicit success/error feedback |

Chart bars and pie slices on the Impact, Excellence and Funding pages are clickable - they open
that department's profile. The header has a portal-wide search (`Ctrl+K` or `/`), a dark-mode
toggle (persisted) and a print-to-PDF button.

## Updating data

All **write** endpoints require an admin token (`GET` stays public). The token is read from,
in order: the `ADMIN_TOKEN` environment variable → `backend/.env` (`ADMIN_TOKEN=...`) →
`backend/.admin-token` (auto-generated on first run; printed in the server console).

- **UI:** open `/admin`, paste the token into **Admin access** (Save & verify), then expand a
  section, edit its JSON, Save. Invalid JSON, failed saves, or a missing/wrong token all show an
  explicit error toast; successful saves re-render all affected charts. The token is kept in
  browser localStorage.
- **API** (send `x-admin-token: <token>` or `Authorization: Bearer <token>` on writes):
  - `GET /api/report` - full report JSON (public)
  - `GET /api/report/:section` - one top-level section (public)
  - `PUT /api/report/:section` - replace a section
  - `PATCH /api/report/:section` - merge fields into a section
  - `POST /api/report` - replace the whole report
  - `POST /api/report/reset` - restore `report.backup.json`
  - `POST /api/auth/verify` - check a token without changing data (401 if wrong)

Data lives in `backend/data/report.json` (single source of truth).

## Stack

- **Frontend:** React 18 + Vite + Chart.js (react-chartjs-2) + React Router
- **Backend:** Node.js + Express, JSON file storage
