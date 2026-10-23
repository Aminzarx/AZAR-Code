# AZAR Auth Server

The entire online surface of AZAR CRM (ADR-009): phone number, OTP-request
state, referral validation/relationships, and sessions. No business data —
properties/applicants/deals/etc. all stay on-device (ADR-002).

**Sign-in codes.** `/auth/send-otp` sends a one-time code by SMS through KSS's
Kavenegar account (verify/lookup API, `KAVENEGAR_API_KEY` + `KAVENEGAR_OTP_TEMPLATE`
in the service's environment file); the code lasts 3 minutes, 5 wrong tries void it.
Until the app's final approval (Amin #4277) the environment file also sets
`AZAR_FIXED_OTP_CODE=123456`: then no SMS is sent and every code is that one
(expiry and wrong-try limit unchanged). Remove the line and restart to switch SMS back on.

**`AMINZX` is a "mother" referral code**, always valid at `/auth/register`
regardless of whether any user actually holds it, until told otherwise —
see `MASTER_REFERRAL_CODE` in `authRoutes.js`. It resolves to the bootstrap
account as referrer. Every registration also stores the exact code that was
typed (`users.used_referral_code`) alongside the phone number, separately
from the new code minted for that account.

## Endpoints

- `GET /health`
- `POST /auth/send-otp` `{ phoneNumber }`
- `POST /auth/verify-otp` `{ phoneNumber, code }` — `code` is the SMS code (or `AZAR_FIXED_OTP_CODE` while set)
- `POST /auth/register` `{ phoneNumber, referralCode }`
- `POST /auth/login` `{ phoneNumber }`
- `POST /auth/delete-account` `{ phoneNumber }` — requires a fresh OTP-verified state

A fresh database is seeded with one bootstrap user (referral code
`AZARSEED`, mirroring the app's own former local bootstrap migration) so the
very first real registration has a valid code to use, in addition to the
`AMINZX` mother code.

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
_inside_ the container's own network namespace. The app is hardcoded to
call `https://api.zarandix.ir`.

Required GitHub repo secrets (Settings → Secrets and variables → Actions):
`VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`.
