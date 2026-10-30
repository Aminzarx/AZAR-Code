# ایوان (EYVAN) — اپ مشاوران املاک

این مخزن همه‌ی کد ایوان را دارد: اپ موبایل، نسخه‌ی وب برای آیفون، داشبورد دفتر املاک و سرور ورود.
هر کسی با این مخزن و راهنمای زیر می‌تواند ایوان را جدا ادامه دهد.
**هیچ رمز، کلید یا فایل امضایی داخل این مخزن نیست.** آن‌ها جدا و دستی تحویل داده می‌شوند (بخش «چیزهایی که در گیت‌هاب نیست»).

شاخه‌ی به‌روز: `kss/update-system`. اپ الان نسخه‌ی ۱.۵.۱۵ است و تغییرات هر نسخه در `docs/changelog.md` آمده است.

## بخش‌ها

| پوشه | چیست | کجا اجرا می‌شود |
|---|---|---|
| `/` (`src/`, `android/`, `ios/`) | اپ موبایل ایوان (React Native). همه‌ی داده‌ها روی خود گوشی و رمزگذاری‌شده است | فایل نصب: `kssx.ir/dl/eyvan.apk` |
| `web/` | همان اپ در مرورگر، برای کاربران آیفون («افزودن به صفحه‌ی اصلی») | `app.kssx.ir` |
| `office/` | داشبورد مدیر دفتر املاک (وب) | `office.kssx.ir` و `kssx.ir/app/office` |
| `server/` | سرور ورود (azar-auth): ورود با پیامک، کد معرف، همگام‌سازی رمزگذاری‌شده، اشتراک و توکن، دفترها | `api.zarandix.ir` |
| `docs/` | مستندات محصول، معماری، امنیت و تغییرات هر نسخه | — |
| `scripts/publish-apk.sh` | انتشار نسخه‌ی جدید اپ (فایل نصب + خبر به‌روزرسانی در اپ‌های نصب‌شده) | — |

## اجرای محلی

پیش‌نیاز: Node.js نسخه‌ی ۲۲ یا بالاتر؛ برای اندروید Android Studio و SDK (حداقل API 26) و JDK 17.

**سرور ورود**
```bash
cd server
npm install
cp .env.example .env    # مقدارها را پر کنید؛ برای آزمایش AZAR_FIXED_OTP_CODE=123456 کافی است
set -a; . ./.env; set +a
PORT=8787 npm start      # داده در server/data/azar-auth.db
npm test
```

**اپ اندروید**
```bash
npm install
npm start                # Metro
npm run android          # روی شبیه‌ساز یا گوشی
npm test                 # آزمون‌ها؛ npm run typecheck و npm run lint هم هست
```
آدرس سرور در `src/infrastructure/auth/config.ts` است (الان `https://api.zarandix.ir`).

**نسخه‌ی وب (آیفون)**
```bash
cd web
npm install --legacy-peer-deps
npm run dev              # http://localhost:5190 ؛ برای سرور محلی: EYVAN_API_TARGET=http://localhost:8787
npm run build            # خروجی در web/dist
```

**داشبورد دفتر**
```bash
cd office
npm install
npm run dev              # درخواست‌های /app/office/api به سرور محلی می‌رود (office/vite.config.ts)
npm run build            # خروجی در office/dist
```

## ساخت فایل نصب اندروید

۱. ساخت: `cd android && ./gradlew assembleRelease` یا گردش‌کار گیت‌هاب `.github/workflows/android-build.yml` (Actions → Run workflow).
۲. امضا با کلید انتشار ایوان (در مخزن نیست):
```bash
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
apksigner sign --ks <azar-release.p12> --ks-key-alias azar --ks-pass file:<password-file> --out eyvan-<version>.apk aligned.apk
apksigner verify --print-certs eyvan-<version>.apk
```
اثر انگشت گواهی باید با نسخه‌های قبلی یکی باشد؛ وگرنه گوشی‌ها به‌روزرسانی را نمی‌پذیرند.
۳. انتشار: `EYVAN_DEPLOY_HOST=user@server scripts/publish-apk.sh <version> eyvan-<version>.apk "<یادداشت فارسی>"`

## نصب روی سرور

- **سرور ورود:** کد `server/` در `/opt/azar-auth` و سرویس systemd به نام `azar-auth` (نمونه: `server/deploy/azar-auth.service`). متغیرها در فایلی بیرون از مخزن (فهرست نام‌ها: `server/.env.example`). پشتیبان شبانه: `server/deploy/install-nightly.sh`. پیش از هر تغییر از `data/azar-auth.db` پشتیبان بگیرید.
- **وب آیفون:** `server/deploy/deploy-web.sh` و `server/deploy/nginx-app.kssx.ir.conf` (راهنما در `web/README.md`).
- **داشبورد دفتر:** خروجی `office/dist` در `/var/www/eyvan-office-app`؛ تنظیم nginx در `office/deploy/`.

## چیزهایی که در گیت‌هاب نیست

این‌ها عمداً بیرون از مخزن نگه داشته می‌شوند و باید جداگانه و امن تحویل داده شوند:
- کلید امضای اپ (`azar-release.p12`) و رمز آن. بدون همین کلید، نسخه‌ی جدید روی اپ‌های نصب‌شده نصب نمی‌شود.
- مقدارهای فایل محیطی سرور: کلید کاوه‌نگار، کلیدهای رمزگذاری و امضا، رمز ورود یکپارچه، کلیدهای پرداخت و قیمت‌گذاری.
- نشانی و دسترسی سرور (SSH).
- پایگاه داده و پشتیبان‌ها (اطلاعات کاربران).

---

## English (short)

EYVAN is a real-estate agent CRM. This repo holds the whole product:
- the React Native app (`src/`, `android/`, `ios/`);
- the same app on the web for iPhone users (`web/`, react-native-web + Vite);
- the office manager's dashboard (`office/`, React + Vite);
- the sign-in/sync server (`server/`, Express + SQLite, live as `azar-auth` behind `api.zarandix.ir`).

**Run locally**
- Server: `cd server && npm install && npm start`, with env from `server/.env.example`.
- App: `npm install && npm start && npm run android`.
- Web: `cd web && npm install --legacy-peer-deps && npm run dev`.
- Office: `cd office && npm install && npm run dev`.

**Release APK**
1. Build it with `./gradlew assembleRelease` or the `android-build.yml` workflow.
2. Run `zipalign`.
3. Sign it with `apksigner` using the EYVAN release key, which is not in this repo.
4. Publish with `EYVAN_DEPLOY_HOST=user@server scripts/publish-apk.sh`.

**Deploy**
- Server: systemd unit `server/deploy/azar-auth.service`.
- Nginx: configs in `server/deploy/` and `office/deploy/`.
- Web: steps in `web/README.md`.

**Not in the repo (by design)**
- The release signing key and its password.
- Every secret value of the server's env file. Only the names are in `server/.env.example`.
- Server host and SSH access.
- Databases and backups.

These are handed over separately. Product docs live in `docs/`; per-version changes are in `docs/changelog.md`.
