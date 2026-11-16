# Frontend

React, TypeScript, and Vite frontend for the Intelligent Medication Support Platform.

## Local setup (Windows PowerShell)

1. Install Node.js LTS.
2. From this folder, install dependencies:
   ```powershell
   npm install
   ```
3. Copy `.env.example` to `.env`. Fill in the Supabase project URL and publishable (or legacy anon) key from the Supabase project settings. Keep the `.env` file local; do not commit it.
4. Start the frontend:
   ```powershell
   npm run dev
   ```
5. Start the FastAPI backend separately from `Backend/server`:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   python -m uvicorn app.main:app --reload
   ```

The frontend signs in with Supabase Auth and sends the resulting access token to the backend for medication reads and writes. The backend must use the same Supabase project. User registration may require email confirmation, depending on the project's Auth settings.

The medication list and add-medication form use the backend API. The Find a Pharmacy page uses browser geolocation with explicit permission and searches OpenStreetMap's public Overpass API; the user's coordinates are sent to that service when searching. Pharmacy coverage and opening-hour tags may be incomplete. Dose check-offs, history, and other demonstration screens are not yet persisted by the API.

## Available scripts

- `npm run dev` — start the Vite development server
- `npm run build` — type-check and create a production build
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build
