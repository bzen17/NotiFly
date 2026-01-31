# Notifly Deployment Guide (Free-tier friendly)

This document explains how to deploy the Notifly monorepo using free-tier services:

- Frontend: Vercel (Next.js)
- Backend: Render (Web service + Background workers)
- Redis Streams: Upstash (serverless Redis)
- Postgres: Neon (serverless Postgres)
- MongoDB: MongoDB Atlas (free tier)

IMPORTANT RULES

- `libs/delivery-adapters` is a library only and must NOT be deployed as a service.
- `router-service` and `worker-email` are background workers and MUST NOT expose HTTP ports.
- `producer-service` is the only public backend service.

Quick overview (order):

1. Create databases and Redis (Neon, MongoDB Atlas, Upstash).
2. Provision Render services (router & worker-email first, producer last).
3. Deploy frontend to Vercel and set API URL to the Producer service URL.

Render: service definitions

- See `render.yaml` at repository root for Render service config.

Environment variables (per service)

Common vars used across services (set these from Neon/Atlas/Upstash credentials):

- `DATABASE_URL` — Neon Postgres connection string
- `MONGO_URI` — MongoDB Atlas connection string
- `UPSTASH_REDIS_REST_URL` — Upstash REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` — Upstash REST token
- `NODE_ENV` — production

Producer service (`services/producer-service`)

- Type: Web Service (public)
- Required env vars:
  - `DATABASE_URL`
  - `MONGO_URI` (if used)
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `JWT_SECRET` (auth if used)
  - `PORT` (Render sets automatically, default 3000)

Router service (`services/router-service`)

- Type: Background Worker (no HTTP)
- Required env vars:
  - `DATABASE_URL`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `MONGO_URI` (if needed)

Worker-email (`services/worker-email`)

- Type: Background Worker (no HTTP)
- Required env vars:
  - `MONGO_URI` or `DATABASE_URL` (for delivery metadata)
  - `EMAIL_PROVIDER_API_KEY` (SendGrid / SES / mock)
  - Provider specific vars (e.g., `SENDGRID_API_KEY`)

Steps (detailed)

1. Provision databases & Redis
   - Create a Neon Postgres DB and copy `DATABASE_URL`.
   - Create a MongoDB Atlas cluster and copy `MONGO_URI`.
   - Create an Upstash Redis database and copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

2. Prepare Render
   - In Render dashboard, click "New+" → "Import from GitHub" and point to the repo.
   - Render will detect `render.yaml`. If not, create services manually with these values:
     - `notifly-router` (Background worker)
       - Root: `services/router-service`
       - Build command: `npm ci && npm run build`
       - Start command: `npm run start`
     - `notifly-worker-email` (Background worker)
       - Root: `services/worker-email`
       - Build: `npm ci && npm run build`
       - Start: `npm run start`
     - `notifly-producer` (Web service)
       - Root: `services/producer-service`
       - Build: `npm ci && npm run build`
       - Start: `npm run start`
   - For each service, add environment variables in Render's Dashboard (do NOT commit secrets).

3. Deploy order
   - Deploy `notifly-router` and `notifly-worker-email` first so background processing is ready.
   - Deploy `notifly-producer` last (public API) — it will depend on the same DB and Redis.

4. Frontend (Vercel)
   - Connect the `web` folder to Vercel (root is `web` or set project to that folder).
   - Set `NEXT_PUBLIC_API_URL` to the Producer public URL (from Render service).

Notes & recommendations

- Use the `libs/env-validator` helper in each service to validate important env vars at startup.
  Example import path: `../../libs/env-validator` or `@notifly/env-validator` if you wire up workspace references.
- Keep secrets in Vercel/Render/Upstash/Neon/Atlas dashboards — do not store them in the repo.
- The Render free tier provides background workers suitable for low-throughput testing and development.

Single-service (colocated) deployment on Render

For a zero-cost or simplified deployment you can run the entire system from a single Render Web service by using the producer service as the single entrypoint. The `producer-service` contains a bootstrap that will start the HTTP API and — optionally — spawn the router and email worker as child processes. This is useful for demos, prototypes, or when you want to avoid multiple Render service slots.

How to deploy the single-service approach

1. In Render create a new **Web Service** (example name: `notifly-single`).
2. Repository Root / Root Directory: set to `services/producer-service`.
3. Build Command: `npm ci && npm run build`.
4. Start Command: `npm run start`.
5. Environment variables (important):
   - Set all common secrets (`DATABASE_URL`, `MONGO_URI`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `JWT_SECRET`, etc.).
   - To enable colocated workers set:
     - `ENABLE_ROUTER=true`
     - `ENABLE_EMAIL_WORKER=true`
   - To run _only_ the HTTP API (no spawned workers), set both flags to `false`.
6. Do NOT create separate `notifly-router` / `notifly-worker-email` services in Render if you intend to use the single-service approach — otherwise you'll have duplicate consumers. If you previously created separate worker services, either delete them or set the `ENABLE_*` flags appropriately.

Operational notes and caveats

- Child processes are spawned by the producer process. Render will manage the main process lifecycle; ensure you test graceful shutdowns and check Render logs for both the main process and spawned child output.
- The code includes graceful shutdown handling for the Redis consumer (consumer wake-up + `quit()`/`disconnect()` fallbacks). Still, validate shutdown behavior in Render on your chosen instance size.
- This approach is recommended for low-cost deployments and prototypes. For production workloads where independent scaling, isolation, and lifecycle management are required, deploy `router-service` and `worker-email` as separate Render background workers instead.

Interview framing (very important)

If asked:

“Why not separate deployments?”

Say:

“For a zero-cost deployment I colocated services, but the system is designed to be split into independent services without code changes.”

This answer demonstrates pragmatic cost-awareness while signalling that the architecture supports proper service separation when you need it.

Troubleshooting

- If a background worker appears to bind to ports, check that your code doesn't call `app.listen()` in worker bundles.
- If you have TypeScript compile issues on Render, ensure `npm run build` emits to `dist/` and your `start` runs `node dist/index.js`.

Files added by this guide

- `render.yaml` — Render infra-as-code for services.
- `services/*/Dockerfile` — optional Dockerfiles for each service.
- `.github/workflows/ci.yml` — CI that installs deps, runs tests, and builds packages in the monorepo.
- `libs/env-validator` — small zod-based env validation helper.

## Recent changes (2026-01-31)

- A Postgres migration was added: `infra/sql/001-add-channel-to-deliveries.sql`. Apply it during your deployment/migration step so the Router and Workers can use the `channel` column for routing and worker assignment.
