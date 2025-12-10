# NotiFly - Starter

Local dev: docker-compose up (Redis, Postgres, Mongo)
See /services/producer-service and /web/admin-frontend for starters.

## Formatting

Add a root `package.json` with Prettier scripts and a `.prettierrc.cjs` config.

- Run one-off formatting with:

```
npx prettier --write "**/*.{js,ts,tsx,jsx,json,md,css,scss,html,yml,yaml,sql,mdx}"
```

- Or use the helper script:

```
./format.sh
```

- To check formatting without changing files:

```
npx prettier --check "**/*.{js,ts,tsx,jsx,json,md,css,scss,html,yml,yaml,sql,mdx}"
```

Install Prettier locally with `npm install` at the repo root to use the scripts.
