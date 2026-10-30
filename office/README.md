# EYVAN office dashboard

The real-estate office manager's web dashboard (Amin #5659/#5913/#5934). It talks to the sign-in server's `/office` API
(`server/src/officeRoutes.js`).

```bash
npm install
npm run dev       # /app/office/api is proxied to a local server (vite.config.ts)
npm run build     # dist/ → live in /var/www/eyvan-office-app
```
It is served at `office.kssx.ir` and at `kssx.ir/app/office` (nginx: `deploy/office.kssx.ir.conf`, `deploy/kssx-app-office.conf`).
