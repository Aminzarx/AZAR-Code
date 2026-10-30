# EYVAN web (app.kssx.ir)

The same app as Android (`../src`), rendered in the browser by react-native-web, for iPhone users (#5183). It is
installed from Safari with «Add to Home Screen» and then opens full-screen like an app.

## How it works
- `vite.config.ts` points `react-native` at react-native-web and every native module at a browser stand-in in
  `src/shims/` (same exports): op-sqlite → sql.js, keychain/fs → IndexedDB sealed with a non-extractable AES key,
  quick-crypto → WebCrypto + @noble/ciphers + hash-wasm, document picker → file input, calendar → «denied».
- Where a whole module differs, the app has a `*.web.ts(x)` file next to the Android one (Vite prefers it, Metro never
  loads it): `config.web.ts` (server = `/api` on the same address), `listingPhotos.web.ts` / `profilePhoto.web.ts`
  (canvas → WebP/JPEG, EXIF dropped), `calendarService.web.ts` (a `.ics` file per contract reminder),
  `PrivacyCover.web.tsx`, `UpdateChecker.web.tsx` (no APK updates).
- Amin #5199 on the web (`src/guards.ts`): no selecting, copying, cutting, long-press menu, dragging, printing or saving
  the page; the screen is covered when the app leaves the screen. Screenshots cannot be blocked by a browser.
- `public/sw.js`: the app starts offline; `/api` is never cached.
- `src/installGuide.ts`: on iPhone Safari, a short «Add to Home Screen» guide first.

## Run and build
```bash
npm install --legacy-peer-deps
npm run dev        # http://localhost:5190, /api proxied to the live azar-auth (dev fetch guard stops loops)
npm run build      # dist/
npm run preview    # the built dist on http://localhost:5191
```
`?guide` on the dev server shows the iPhone guide in any browser.

## Deploy (VPS)
```bash
tar czf eyvan-web-dist.tgz -C dist .
scp eyvan-web-dist.tgz "$EYVAN_DEPLOY_HOST":/root/
ssh "$EYVAN_DEPLOY_HOST" bash /root/deploy-web.sh
```
`server/deploy/deploy-web.sh` keeps the previous build in `/var/www/eyvan-web.prev` (rollback: swap the folders).
The site is `server/deploy/nginx-app.kssx.ir.conf` (live as /etc/nginx/sites-available/app.kssx.ir.conf).
