<!-- Short summary of the change -->

## What/Why

- Brief description of the change and the reason for it.

## Checklist (all must pass before merge)

- [ ] Prettier
- [ ] ESLint
- [ ] TypeScript type-check
- [ ] Unit tests
- [ ] Build

## CI / Deployment notes

- Web changes will run CI via `.github/workflows/ci-web.yml` and deploy to Vercel on push to `main`.
- Backend/libs changes will run CI via `.github/workflows/ci-backend.yml` and deploy via `.github/workflows/deploy.yml` (Render placeholder).

## Secrets

- Ensure VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID are configured for web deploys.
- Ensure RENDER_API_KEY and RENDER_SERVICE_ID are configured for backend deploys (if using Render).

## Additional notes

- delivery-adapters is a library only and should not be deployed.
- router-service and worker-email must not expose HTTP servers.
