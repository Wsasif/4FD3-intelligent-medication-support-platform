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
- `npm run test:e2e` — run the Playwright browser smoke tests

## Browser smoke tests

Install the Playwright browser once:

```bash
npx playwright install chromium
```

Run the login-page test and the optional signed-in medications test:

```bash
npm run test:e2e
```

The signed-in test needs a Supabase test user's credentials. Set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in the terminal before running the test. It skips when these variables are not set. The test only reads the medications page; it does not create or change records. Playwright starts Vite on `http://localhost:5174` if it is not already running. The backend must be running separately.

The sign-up test generates a random email and password, then deletes the created Auth user in a `finally` block. It runs automatically when `E2E_SUPABASE_SERVICE_ROLE_KEY` is in the local `Frontend/.env`; otherwise it skips. The project URL is read from `VITE_SUPABASE_URL`. The Playwright Node config reads the unprefixed service key for cleanup only; never rename it to a `VITE_` variable, use it in frontend source, or commit it. Use a dedicated test Supabase project and disable email confirmation or configure its test email provider.

To watch the browser and slow down its actions on macOS/Linux:

```bash
PLAYWRIGHT_SLOW_MO=700 npm run test:e2e -- --headed
```
