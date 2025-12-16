# Router Service

Consumes `notifications.incoming` Redis stream, loads events from MongoDB, optionally renders a Handlebars template, expands recipients into deliveries, inserts delivery rows into Postgres, and publishes messages to channel-specific Redis streams.

See `src/README.md` for usage.
