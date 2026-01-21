# worker-email

Purpose
- Background consumer that reads from Redis streams, performs email delivery via adapters, records delivery rows in Postgres, and writes failures to a DLQ.

Prerequisites
- Node.js 18+, Redis, MongoDB, Postgres reachable from this service.

Key environment variables (see `.env.example`)
- `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
- `MONGO_URI`
- `PG_CONNECTION` (Postgres connection string)
- `RATE_LIMIT`, `RATE_WINDOW` (optional rate limiting controls)
- `PRETTY_LOGS`, `LOG_LEVEL` (logging)

Local development

```bash
cd services/worker-email
npm install
npm run dev
```

Build & production

```bash
npm run build
npm run start
```

Behavior and notes
- Streams: listens to `notifications.email` and uses a consumer group.
- Retries: scheduled retries are written to `notifications.retry` and malformed entries are removed.
- DLQ: permanent failures are written to `notifications.dlq` for operator inspection.
- Idempotency: delivery dedupe is performed using Redis keys to avoid duplicate sends.

Observability
- Structured logs (pino). Use `LOG_LEVEL` / `PRETTY_LOGS` to control verbosity.
- Metrics: instrumented events are emitted to logs; consider adding Prometheus exporters in production.

Testing
- Unit tests (if present) run with:

```bash
npm test
```

Troubleshooting
- If the consumer doesn't receive messages, confirm Redis stream keys exist and consumer group is created.
- If deliveries are not recorded, confirm `PG_CONNECTION` and that the `deliveries` table exists.

Security
- Do not commit API keys in `.env` files. Keep secrets in environment or secret manager when deploying.

See also
- `infra/` for Postgres/Redis setup and `libs/delivery-adapters` for delivery provider implementations.
