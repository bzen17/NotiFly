Notifly Frontend (Internal dashboard)

Overview

- Purpose: Admin dashboard for managing campaigns, viewing DLQ and delivery metrics.

Requirements

- Node.js 18+ and npm/yarn
- A running Producer API (see services/producer-service)

Environment

- Use `.env.local` for local overrides. Key variables:
  - `NEXT_PUBLIC_API_BASE_URL` — base URL for backend API (default `http://localhost:3000`)

Local development

- Install dependencies:

```bash
cd web
npm install
```

- Start dev server:

```bash
npm run dev
```

Build & production

- Build:

```bash
npm run build
```

- Start (production):

```bash
npm run start
```

Testing & linting

- Run unit / integration tests (if any):

```bash
npm test
```

- Linting / formatting:

```bash
npm run lint
npm run format
```

Observability & troubleshooting

- The UI logs to the browser console and reports errors via the API responses.
- If pages show empty data, confirm `NEXT_PUBLIC_API_BASE_URL` points to a running Producer API and that CORS is configured.

Notes

- This repository contains only the dashboard. Backend services (producer, router, worker) must be available and configured to use the same Postgres / Redis instances for accurate metrics and DLQ views.

For more backend deployment and infra notes see the repo top-level README and the `infra/` folder.
