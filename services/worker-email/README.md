# worker-email

A simple Node.js TypeScript consumer that reads from Redis Streams (`notifications.email`) and performs mock email deliveries.

Features:

- Reads from Redis Streams using consumer groups
- Fetches event documents from MongoDB
- Dedup using Redis key `dedupe:{hash}`
- Per-tenant rate limiting with Redis token-bucket-like counter
- Mock delivery adapter
- Exponential backoff retries written to `notifications.retry`
- DLQ fallback `notifications.dlq`
- Graceful shutdown handling

Running (dev):

```bash
cd notifly/services/worker-email
npm install
npm run dev
```

Environment variables:

- `REDIS_HOST`, `REDIS_PORT`
- `MONGO_URI`
- `POSTGRES_URL`
- `RATE_LIMIT`, `RATE_WINDOW`
