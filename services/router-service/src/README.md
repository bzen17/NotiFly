# Router Service (developer notes)

This file contains developer-level notes and configuration details for `router-service`.

Important environment variables (see `.env.example`)

- `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
- `MONGO_URI`
- `PG_CONNECTION`
- `CONSUMER_GROUP`, `CONSUMER_NAME`

Run & test locally

```bash
cd services/router-service
npm install
npm run dev
```

DB schema notes

- Ensure a `deliveries` Postgres table exists and includes at minimum: `id`, `campaign_id`/`event_id`, `recipient`, `channel`, `status`, `payload`, `created_at`.

Behavioral notes

- Templates are read from MongoDB `templates` collection when campaign payloads reference a template id.
- When `requeue` flags are present, router will publish targeted incoming pointers for single-recipient requeues.

Troubleshooting

- If messages are not published to channel streams, confirm the Redis connection and that the stream keys exist.
