# AZAR Auth Server

The entire online surface of AZAR CRM (ADR-009): phone number, OTP-request
state, referral validation/relationships, and sessions. No business data —
properties/applicants/deals/etc. are kept per account under `/sync` (AZAR-SYNC-001, encrypted with `AZAR_SYNC_KEY`).

**Sign-in codes.** `/auth/send-otp` sends a one-time code by SMS through KSS's
Kavenegar account (verify/lookup API, `KAVENEGAR_API_KEY` + `KAVENEGAR_OTP_TEMPLATE`
in the service's environment file; since Amin #4915 the template is «Verification», id 1548159 kept
as `KAVENEGAR_OTP_TEMPLATE_ID` for reference — the API takes the name); the code lasts 3 minutes, 5 wrong tries void it.
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

Live since Amin #4113 (2026-10-22): the code of this folder in `/opt/azar-auth` on the KSS host, run by the systemd
unit `azar-auth` (copy in `deploy/azar-auth.service`) on `127.0.0.1:8787`, behind nginx as `https://api.zarandix.ir`.
Environment names (no values) are in `.env.example`; the real file lives outside the repo. To update: back up
`data/azar-auth.db`, copy `src/` and `package*.json` to `/opt/azar-auth`, `npm ci --omit=dev`, `systemctl restart azar-auth`,
then `curl https://api.zarandix.ir/health`. The nightly per-account backup is `deploy/install-nightly.sh`.

`.github/workflows/deploy-backend.yml` deploys to the old sandbox container and only runs by hand.
