# Intelligent Medication Support Platform

Medication adherence and clinical decision-support web app (ENGTECH 4FD3, Group 5).
Users can track medications, get intake and refill reminders, see drug interaction warnings, and find their pharmacies.

> Alerts and analysis are meant to assist users and are **not** medical advice or diagnosis.

## Tech stack

| Part | Technology |
|------|------------|
| Frontend | React + TypeScript (`client/`) |
| Backend | FastAPI, Python (`server/`) |
| Database | Supabase (hosted PostgreSQL) |
| Auth | JWT issued by the FastAPI backend |

## Project structure

```
├── client/                 React frontend
├── docs/                   Diagrams, design notes, report material
└── server/                 FastAPI backend
    ├── .env.example        Settings template (copy to .env)
    ├── requirements.txt    Python packages
    ├── app/
    │   ├── main.py         Starts the API
    │   ├── core/           Settings and security (passwords, JWT)
    │   ├── db/             Database connection to Supabase
    │   ├── models/         Database tables
    │   ├── schemas/        Request/response validation
    │   ├── services/       Business logic (alerts, interactions)
    │   └── api/v1/routes/  API endpoints
    └── tests/              pytest tests
```

## Backend setup (Windows)

Requires **Python 3.14** and Git.

1. Clone the repo:
   ```
   git clone https://github.com/Wsasif/intelligent-medication-support-platform.git
   cd intelligent-medication-support-platform/server
   ```
2. Create and activate a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install packages:
   ```
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in the Supabase connection string (ask the team for it; never commit `.env`).
5. Run the API:
   ```
   uvicorn app.main:app --reload
   ```
6. Check it works: open http://127.0.0.1:8000/health (should show `{"status":"ok"}`). Interactive API docs are at http://127.0.0.1:8000/docs.

> After installing a new package, update the list with
> `pip freeze | Out-File -Encoding utf8 requirements.txt` (PowerShell) so it stays readable on GitHub.

## Git workflow

1. Update main: `git checkout main` then `git pull`
2. Create a branch: `git checkout -b feature/<short-name>`
3. Commit your work and push: `git push -u origin feature/<short-name>`
4. Open a pull request into `main` and have a teammate review it before merging.
