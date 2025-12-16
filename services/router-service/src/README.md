# Router Service

Consumes `notifications.incoming` Redis stream, loads events from MongoDB, optionally renders a Handlebars template, expands recipients into deliveries, inserts delivery rows into Postgres, and publishes messages to channel-specific Redis streams.

Environment variables (see `.env.example`):

- `REDIS_URL` - Optional full Redis connection string (override)
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` - Redis host/port/password used to construct `REDIS_URL` when not provided
- `MONGO_URI` - Optional full MongoDB connection string (override)
- `MONGO_HOST` / `MONGO_PORT` / `MONGO_USER` / `MONGO_PASS` / `MONGO_DB` - Mongo parts used when `MONGO_URI` is not provided
- `PG_CONNECTION` - Optional full Postgres connection string (override)
- `PG_HOST` / `PG_PORT` / `PG_USER` / `PG_PASS` / `PG_DB` - Postgres parts used when `PG_CONNECTION` is not provided
- `CONSUMER_GROUP` - Redis consumer group name
- `CONSUMER_NAME` - consumer instance name

Run locally:

```bash
cd services/router-service
npm install
npm run dev
```

Notes:

- Ensure the Postgres `deliveries` table exists with appropriate columns: `id uuid primary key`, `event_id text`, `recipient text`, `channel text`, `status text`, `payload jsonb`, `created_at timestamptz`.
- Templates are loaded from MongoDB collection `templates` by `_id` and should have a `body` string.
