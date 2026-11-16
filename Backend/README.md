# Intelligent Medication Support Platform

Medication adherence and clinical decision-support web app (ENGTECH 4FD3, Group 5).
Users can track their medications, get dose and refill reminders, see drug-drug interaction warnings, and find their saved pharmacies on a map.

> Alerts and analysis are meant to assist users and are **not** medical advice or diagnosis.
> No warning does not mean a combination is safe. All development and test data is fictional.

## Tech stack

| Part | Technology |
|------|------------|
| Frontend | React + TypeScript with Vite (`client/`, in progress) |
| Backend | FastAPI, Python 3.14 (`server/`) |
| Database | Supabase (hosted PostgreSQL) with Row Level Security (`supabase/migrations/`) |
| Auth | Supabase Auth. The browser signs in with Supabase; the backend verifies the access token (ES256, Supabase JWKS) |
| Drug data | DDInter 2.0 drug-drug interaction dataset (`data/`) |
| Maps | Leaflet + OpenStreetMap |
| Testing | pytest, Vitest, Playwright, Lighthouse/axe |

## How it fits together

1. The React app signs the user in with Supabase Auth and receives an access token.
2. Every data request goes from React to the FastAPI backend with `Authorization: Bearer <token>`.
3. FastAPI verifies the token, applies the rules (validation, interaction checks, refill maths) and reads/writes the Supabase database, always filtered to the signed-in user.
4. Row Level Security in Supabase is a second layer of protection.

Passwords never pass through our backend; Supabase Auth handles them.

## Project structure

```
├── client/                       React frontend (coming)
├── data/
│   └── README.md                 Where the DDInter CSVs come from (CSVs go in data/raw/, not committed)
├── docs/                         Diagrams, design notes, report material
├── supabase/
│   └── migrations/               SQL run in the Supabase SQL editor
│       ├── 001_core_tables.sql   profiles, pharmacies, medications, medication_schedules, dose_logs
│       └── 002_ddinter_tables.sql drugs and drug_interactions
└── server/                       FastAPI backend
    ├── .env.example              Settings template (copy to .env)
    ├── requirements.txt          Python packages
    ├── scripts/
    │   └── import_ddinter.py     One-time import of the DDInter CSVs into Supabase
    ├── app/
    │   ├── main.py               Starts the API, health checks, CORS
    │   ├── core/                 Settings (config.py) and token verification (security.py)
    │   ├── db/                   Database connection pool
    │   ├── schemas/              Request/response validation (drug.py, medication.py)
    │   ├── services/             Database queries and business rules (medications.py)
    │   ├── models/               (not used yet)
    │   └── api/v1/routes/        API endpoints (users.py, drugs.py, medications.py)
    └── tests/                    pytest tests (coming)
```

## Backend setup (Windows, PowerShell)

Requires **Python 3.14** and Git.

1. Clone the repo:
   ```
   git clone https://github.com/Wsasif/4FD3-intelligent-medication-support-platform.git
   cd 4FD3-intelligent-medication-support-platform\server
   ```
2. Create and activate a virtual environment:
   ```
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
   If PowerShell blocks the script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once and try again.
3. Install packages:
   ```
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `SUPABASE_URL`. Get the real values from the backend lead by private message. Never commit `.env`.
5. Run the API:
   ```
   uvicorn app.main:app --reload
   ```
6. Check it works:
   - http://127.0.0.1:8000/health should show `{"status":"ok"}`
   - http://127.0.0.1:8000/health/db should show the number of drugs (1,939)
   - Interactive API docs: http://127.0.0.1:8000/docs

> After installing a new package, update the list with
> `pip freeze | Out-File -Encoding utf8 requirements.txt` (PowerShell) so it stays readable on GitHub.

## Database setup (only for a new Supabase project)

The team already shares one Supabase project, so you normally skip this.

1. In the Supabase SQL editor, run `supabase/migrations/001_core_tables.sql`, then `002_ddinter_tables.sql`.
2. Download the 8 DDInter 2.0 CSVs into `data/raw/` (see `data/README.md`).
3. From `server/` with the virtual environment active: `python scripts/import_ddinter.py`

## API endpoints (so far)

All `/api/v1` endpoints need a valid Supabase access token. Users only ever see their own data.

| Method | Path | What it does |
|--------|------|--------------|
| GET | `/health` | API is running |
| GET | `/health/db` | Database is reachable |
| GET | `/api/v1/users/me` | The signed-in user |
| GET | `/api/v1/drugs/search?q=&limit=` | Search drugs by name (2 to 100 characters, up to 25 results) |
| POST | `/api/v1/medications` | Add a medication with its intake times |
| GET | `/api/v1/medications?include_inactive=` | List my medications |
| GET | `/api/v1/medications/{id}` | One medication |
| PATCH | `/api/v1/medications/{id}` | Update a medication |
| DELETE | `/api/v1/medications/{id}` | Delete a medication |

Coming next: interaction checking, dose logs and refill alerts, today's schedule and history, pharmacies.

## Git workflow

1. Update main: `git checkout main` then `git pull`
2. Create a branch: `git checkout -b feature/<short-name>` (or `docs/...`, `chore/...`)
3. Commit your work and push: `git push -u origin feature/<short-name>`
4. Open a pull request into `main` (one PR per feature) and merge it.
5. Delete the branch on GitHub, then locally: `git checkout main`, `git pull`, `git branch -d feature/<short-name>`, `git fetch --prune`

Never commit `.env` files or the raw DDInter CSVs.