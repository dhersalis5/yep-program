# YEP — Young Entrepreneurship Program

Landing page + application form with a backend that stores submissions.

A selective entrepreneurship program for teens in Miami. One semester to learn
from real operators, build a startup, and pitch it live — for a shot at a trip
to Israel. Powered by the Michael-Ann Russell JCC.

## Stack

- **Frontend** — static HTML/CSS/JS in `design/` (landing `index.html`, form `apply.html`)
- **Backend** — Node + Express (`server.js`)
- **Database** — PostgreSQL in production (Render), built-in SQLite (`node:sqlite`) locally

## Run locally

```bash
npm install
npm start          # http://localhost:3000
```

With no `DATABASE_URL`, it stores submissions in a local SQLite file at `./data/applications.db`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Landing page |
| `GET`  | `/apply.html` | Application form |
| `POST` | `/api/apply` | Submit an application (JSON) |
| `GET`  | `/api/applications?token=…` | List submissions (admin) |
| `GET`  | `/api/applications.csv?token=…` | Export submissions as CSV (admin) |
| `GET`  | `/healthz` | Health check |

Admin endpoints require `ADMIN_TOKEN` (set in env; passed as `?token=` or `x-admin-token` header).

## Deploy to Render (Blueprint)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick this repo. `render.yaml` provisions the
   web service **+ a PostgreSQL database** and wires them together.
3. Render sets `DATABASE_URL` automatically and generates `ADMIN_TOKEN`.
   Find the token under the service's **Environment** tab.
4. View submissions: `https://<your-app>.onrender.com/api/applications?token=<ADMIN_TOKEN>`

### Notes

- Render's **free** PostgreSQL is removed after ~30 days — export applications
  regularly via the CSV endpoint, or upgrade the database to a paid plan to keep it.
- The free web service sleeps after inactivity; the first request may take a few
  seconds to wake.
