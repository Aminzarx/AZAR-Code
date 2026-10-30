// AVA: the same formatter as IRIS (messaging/web/src/lib/fmt.ts; KSS UI 1.4 VISUAL-AMD-004). Copy it again when IRIS changes it.
/**
 * Every number, amount and date the panel shows goes through here
 * (docs/DESIGN.md rule 9). One place to change when the rial is redenominated.
 */
const nf = new Intl.NumberFormat('fa-IR');
const TZ = 'Asia/Tehran';

/** Persian digits with ٬ separators. */
export const num = (n: number | string | null | undefined) =>
  n == null || n === '' || Number.isNaN(Number(n)) ? 'نامشخص' : nf.format(Number(n));

/** Persian digits for a string of digits (an order number, a phone), no separators. */
export const digits = (s: string | number | null | undefined) =>
  s == null ? '' : String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);

/**
 * Any digits typed -> Latin, for sending to the API (KSS-UI-CHG-008; the server's twin is core/messaging/src/digits.ts).
 * Invisible marks a phone keyboard or a paste leaves in (ZWNJ/ZWJ, LRM/RLM, U+202A-E, U+2066-9, NBSP, BOM) go too.
 */
export const toLatin = (s: string) => s
  .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
  .replace(/[​-‏‪-‮⁦-⁩ ﻿]/g, '');

/**
 * Props for every field that takes digits (CHG-008 §4): the phone shows its number pad, nothing autocorrects,
 * and the value is never rewritten while typing (convert with toLatin on submit, not in onChange).
 * 'tel' for phone numbers, 'numeric' for codes and counts, 'text' for times like 09:30 (the pads have no colon).
 */
export const numInput = (mode: 'tel' | 'numeric' | 'text' = 'numeric') =>
  ({ dir: 'ltr', inputMode: mode, autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false, autoComplete: 'off' }) as const;

/** Money is stored in RIAL; shown in toman. */
export const toman = (rial: number | null | undefined) => (rial == null ? 'نامشخص' : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(rial / 10) + ' تومان');   // exact (VISUAL §64A)

/** US dollars, for model costs (what the vendor bills): Persian digits and the ٫ decimal, «۱٫۷۰۰ دلار» (Kssx.ir 2026-10-09; was "$1.700") */
export const usd = (n: number | null | undefined) => {
  if (n == null) return 'نامشخص';
  const d = n < 0.01 && n > 0 ? 4 : n < 10 ? 3 : 2;
  return new Intl.NumberFormat('fa-IR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n) + ' دلار';
};

export const ms = (n: number | null | undefined) =>
  n == null ? 'نامشخص' : n < 1000 ? num(Math.round(n)) + ' میلی‌ثانیه' : num(Math.round(n / 100) / 10) + ' ثانیه';

export const duration = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return digits(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
};

const dShort = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const tShort = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const dLong = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, day: 'numeric', month: 'long' });
const wd = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, weekday: 'long' });

/** ۱۴۰۵/۰۷/۱۱ ۱۷:۳۵ - tables */
export const dateTime = (iso: string | null | undefined) => (iso ? dShort.format(new Date(iso)) + ' ' + tShort.format(new Date(iso)) : 'ثبت نشده');
export const date = (iso: string | null | undefined) => (iso ? dShort.format(new Date(iso)) : 'ثبت نشده');
export const time = (iso: string | null | undefined) => (iso ? tShort.format(new Date(iso)) : 'ثبت نشده');
/** شنبه ۱۱ مهر - headers. Built from parts: ICU orders weekday+date badly. */
export const dayTitle = (iso: string | Date) => wd.format(new Date(iso)) + ' ' + dLong.format(new Date(iso));

const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
/** relative under 7 days, absolute after; pair with title={dateTime(iso)} */
export function ago(iso: string | null | undefined): string {
  if (!iso) return 'ثبت نشده';
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return 'همین الان';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), 'day');
  return date(iso);
}

/** 09121234567 -> ۰۹۱۲ ۱۲۳ ۴۵۶۷ (display only; wrap in .ltr) */
export const phone = (p: string | null | undefined) => {
  if (!p) return 'ثبت نشده';
  const d = toLatin(p).replace(/\D/g, '');
  return digits(d.length === 11 ? d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7) : d);
};

/**
 * Search matching only (SEARCH-001 §103): Arabic ي/ك -> Persian ی/ک, half-space and tatweel dropped,
 * Persian/Arabic digits -> Latin, case folded. Stored values are never changed.
 */
export const normalizeFa = (s: string | null | undefined) => toLatin(String(s ?? '').replace(/ /g, ' '))
  .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200d\u0640]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
export const matches = (q: string, ...fields: (string | null | undefined)[]) => {
  const n = normalizeFa(q);
  return !n || fields.some((f) => normalizeFa(f).includes(n));
};

// ---------------------------------------------------------------- message times (MSG-REQ-A16: the real send time) ---
const dKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
/** Tehran calendar day of a moment, e.g. 2026-10-04 - for grouping messages by day. */
export const dayKey = (iso: string | Date) => dKey.format(new Date(iso));
/** «امروز» / «دیروز» / «شنبه ۱۱ مهر» - the separator above a day's messages. */
export function dayLabel(iso: string | Date): string {
  const k = dayKey(iso), today = dayKey(new Date()), yest = dayKey(new Date(Date.now() - 864e5));
  return k === today ? 'امروز' : k === yest ? 'دیروز' : dayTitle(iso);
}
/** Chat list: the time if today, «دیروز», the weekday within a week, else the date. */
export function listTime(iso: string | null | undefined): string {
  if (!iso) return 'ثبت نشده';
  const k = dayKey(iso);
  if (k === dayKey(new Date())) return time(iso);
  if (k === dayKey(new Date(Date.now() - 864e5))) return 'دیروز';
  if (Date.now() - Date.parse(iso) < 6 * 864e5) return wd.format(new Date(iso));
  return date(iso);
}
