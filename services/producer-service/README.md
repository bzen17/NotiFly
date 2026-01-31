# producer-service

Purpose

- API service for creating and managing campaigns, exposing admin endpoints used by the internal dashboard and operator tools.

Prerequisites

- Node.js 18+, Postgres, Redis, MongoDB for metadata (optional depending on features).

Environment (see `.env.example`)

- `PG_CONNECTION` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `MONGO_URI` — Optional MongoDB URI for campaign templates/metadata
- `JWT_SECRET`, `JWT_EXP` — auth defaults for local/dev
- `PRETTY_LOGS`, `LOG_LEVEL` — logging

Local development

```bash
cd services/producer-service
npm install
npm run dev
```

Build & production

```bash
npm run build
npm run start
```

Notes

- This service publishes messages to Redis streams and writes delivery rows to Postgres; ensure schema migrations are applied (see `infra/sql`).
- Error and status strings have been centralized as constants in `src/constants` for safer usage across the codebase.

Testing & linting

```bash
npm test
npm run lint
npm run format
```

Troubleshooting

- If API responds with 403/401, check `JWT_SECRET` and token generation in `auth.service`.
- If metric endpoints are empty, confirm `PG_CONNECTION` and that `deliveries` table exists with expected data.

Security

- Do not commit secrets to git. Use a secret manager or environment injection in production.

See also

- `web` for the dashboard, `services/router-service` and `services/worker-email` for routing and delivery processing.

## Recent changes (2026-01-31)

- A migration was added at `infra/sql/001-add-channel-to-deliveries.sql`. Apply it to Postgres to ensure the `deliveries` schema includes a `channel` column used by routing and workers.
- Build note: production starts expect compiled artifacts in `dist/` — run `npm run build` before `npm run start` in production environments.

For exact environment variables and example `.env` usage, see `src/config/env.ts` in this service.
