# Router Service

Overview

- The Router Service consumes `notifications.incoming` Redis stream, resolves campaign/event data from MongoDB, expands recipients into per-recipient deliveries, writes delivery rows to Postgres, and publishes channel-specific messages for downstream workers.

When to use

- Run this service in environments responsible for converting high-level campaign events into actionable per-recipient messages (email, SMS, push).

Prerequisites

- Node.js 18+
- Redis (streaming), MongoDB (templates/metadata), Postgres (deliveries table)

Important environment variables (see `.env.example`)

- `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
- `MONGO_URI`
- `PG_CONNECTION`
- `CONSUMER_GROUP`, `CONSUMER_NAME`
- `PRETTY_LOGS`, `LOG_LEVEL`

Local development

```bash
cd services/router-service
npm install
npm run dev
```

Build & production

```bash
npm run build
npm run start
```

Developer notes

- Templates: When a campaign references a template id, the service loads the template body from MongoDB `templates` collection.
- Requeue behavior: If an incoming pointer includes a `requeue` flag, router may publish targeted incoming pointers for single-recipient requeues and bypass campaign-level dedupe.
- Idempotency: Router attempts to avoid duplicates via delivery writer and dedupe logic; ensure downstream workers honor `attempt` or `requeue` flags.

DB schema guidance

- Ensure Postgres `deliveries` table contains at least: `id`, `campaign_id`/`event_id`, `recipient`, `channel`, `status`, `payload`, `created_at`. See `infra/sql` for migrations.

Troubleshooting

- Nothing published to channel streams: verify `REDIS_URL` and that the Router can connect; inspect logs for subscription/permission errors.
- Deliveries not created: confirm `PG_CONNECTION`, table schema and that the service has write permissions.

Observability

- Uses structured logging (pino). Configure `LOG_LEVEL` and `PRETTY_LOGS` for local debug.

See also

- `services/producer-service` — API for creating campaigns
- `services/worker-email` and `libs/delivery-adapters` — downstream consumers and adapters
