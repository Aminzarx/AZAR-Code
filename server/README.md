# AZAR Auth Server

The entire online surface of AZAR CRM (ADR-009): phone number, OTP-request
state, referral validation/relationships, and sessions. No business data —
properties/applicants/deals/etc. all stay on-device (ADR-002).

**OTP delivery is disabled by product decision.** No SMS is ever sent;
`/auth/verify-otp` accepts any non-empty code as long as `/auth/send-otp` was
called for that number first. The two-step screen flow in the app is
unchanged — it just never gets an SMS.

## Endpoints

- `GET /health`
- `POST /auth/send-otp` `{ phoneNumber }`
- `POST /auth/verify-otp` `{ phoneNumber, code }` — any non-empty `code` is accepted
- `POST /auth/register` `{ phoneNumber, referralCode }`
- `POST /auth/login` `{ phoneNumber }`

A fresh database is seeded with one bootstrap user (referral code
`AZARSEED`, mirroring the app's own former local bootstrap migration) so the
very first real registration has a valid code to use.

## Running locally

```bash
npm install
PORT=8787 npm start
```

Data is stored in `data/azar-auth.db` (SQLite, gitignored) by default;
override with `AZAR_DB_PATH`.

## Deployment

Deployed automatically by `.github/workflows/deploy-backend.yml` on every
push that touches `server/**`, via SSH to the VPS sandbox described in the
project's deploy-key handoff doc. The workflow:

1. rsyncs this directory to `~/azar-server` on the VPS.
2. Runs `npm ci --omit=dev`.
3. (Re)starts the process under `pm2` as `azar-api`, listening on port
   `8787` inside the container.

The container has no public IP of its own — reaching it from a real phone
requires an nginx vhost on the VPS host (outside the container, set up by
the server admin) proxying a public HTTPS subdomain to `127.0.0.1:8787`
*inside* the container's own network namespace. The app is hardcoded to
call `https://api.zarandix.ir`.

Required GitHub repo secrets (Settings → Secrets and variables → Actions):
`VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`.
