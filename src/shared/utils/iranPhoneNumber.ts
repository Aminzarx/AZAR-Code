/**
 * crm-architecture-audit-v1.md §24 — phone numbers are stored canonical
 * (`+989121234567`) and displayed local (`09121234567`); "at least 8
 * digits" is not real validation, this checks the actual Iranian mobile
 * format (09xxxxxxxxx locally, +989xxxxxxxxx canonical — 11 local digits
 * / +98 followed by 10 digits, always starting with 9 after the prefix).
 */
const LOCAL_FORMAT = /^09\d{9}$/
const CANONICAL_FORMAT = /^\+989\d{9}$/

/** Returns the canonical `+98...` form, or null if `raw` isn't a valid Iranian mobile number. */
export function canonicalizeIranPhoneNumber(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s-]/g, '')
  if (CANONICAL_FORMAT.test(trimmed)) {
    return trimmed
  }
  if (LOCAL_FORMAT.test(trimmed)) {
    return `+98${trimmed.slice(1)}`
  }
  return null
}

/** Canonical `+989121234567` -> local display `09121234567`. Returns the input unchanged if it isn't canonical. */
export function formatIranPhoneNumberForDisplay(canonical: string): string {
  return canonical.startsWith('+98') ? `0${canonical.slice(3)}` : canonical
}
