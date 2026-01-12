# delivery-adapters

Pure TypeScript library providing thin, deterministic adapters for email, SMS and push providers.

Rules:

- Library is pure (no servers, no retries, no DLQ, no queues, no persistence, no business rules).

- Environment variables used (adapters simulate behavior; presence/absence affects results):
- `SENDGRID_API_KEY`, `SENDGRID_FROM`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- `FCM_SERVER_KEY`

Adapters:

- `SendGridAdapter` (email) — env-driven simulation
- `SESAdapter` (email) — stub, throws `Not implemented`
- `MockEmailAdapter` (email) — deterministic mock
- `TwilioAdapter` (sms) — env-driven simulation
- `MockSmsAdapter` (sms) — deterministic mock
- `FcmAdapter` (push) — env-driven simulation

Usage example (preferred import from package entry):

```ts
import { SendGridAdapter } from '@notifly/delivery-adapters';

const a = new SendGridAdapter();
await a.send({ to: 'user@example.com', subject: 'Hi', text: 'Hello' });
```
