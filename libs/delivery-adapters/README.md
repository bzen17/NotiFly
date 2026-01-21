# delivery-adapters

Purpose
- Lightweight, deterministic adapters for sending messages to email, SMS and push providers. Designed to be pure and easily testable; adapters should not implement retry or queueing logic.

Supported adapters
- `SendGridAdapter`, `SESAdapter` (email)
- `MockEmailAdapter` (email, deterministic for tests)
- `TwilioAdapter`, `MockSmsAdapter` (sms)
- `FcmAdapter` (push)

Environment (simulated provider configs)
- `SENDGRID_API_KEY`, `SENDGRID_FROM`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- `FCM_SERVER_KEY`

Usage

```ts
import { SendGridAdapter } from '@notifly/delivery-adapters';

const adapter = new SendGridAdapter();
await adapter.send({ to: 'user@example.com', subject: 'Hi', text: 'Hello' });
```

Testing
- Use `Mock*` adapters for deterministic tests. Adapters are intentionally synchronous-friendly and side-effect minimal to simplify unit tests.

Notes
- Do not put business logic (retry, DLQ, dedupe) in adapters. Keep them as thin providers interfaces to allow provider substitution and easy mocking.
