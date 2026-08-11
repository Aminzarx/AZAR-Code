import {
  toGregorian,
  toJalaali,
  isValidJalaaliDate,
  jalaaliMonthLength,
  isLeapJalaaliYear
} from 'jalaali-js'
import { toEnglishDigits } from './persianText'

export type JalaliDate = {
  year: number
  month: number
  day: number
}

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
]

export function jalaliMonthName(month: number): string {
  return JALALI_MONTH_NAMES[month - 1] ?? ''
}

export function daysInJalaliMonth(year: number, month: number): number {
  return jalaaliMonthLength(year, month)
}

export function isLeapJalaliYear(year: number): boolean {
  return isLeapJalaaliYear(year)
}

/**
 * Accepts a Jalali date typed in essentially any reasonable shape a user
 * might type: Persian or English digits, `/`, `-`, or `.` as a separator,
 * and single- or double-digit month/day (`1405/5/12` and `1405/05/12` are
 * the same date) — per the product requirement that these must be treated
 * identically, not as two different formats to separately support.
 * Returns `null` for anything that isn't a real Jalali calendar date,
 * rather than throwing, since this is meant to sit directly behind a form
 * field's live validation.
 */
export function parseJalaliDate(input: string): JalaliDate | null {
  const normalized = toEnglishDigits(input).trim()
  const match = normalized.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!isValidJalaaliDate(year, month, day)) {
    return null
  }

  return { year, month, day }
}

/** Formats a Jalali date back to the canonical `YYYY/MM/DD` string this app stores and displays. */
export function formatJalaliDate({ year, month, day }: JalaliDate): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${year}/${pad(month)}/${pad(day)}`
}

/** Converts a Jalali calendar date to the Gregorian ISO date (`YYYY-MM-DD`) the database actually stores. */
export function jalaliToGregorianIso(date: JalaliDate): string {
  const { gy, gm, gd } = toGregorian(date.year, date.month, date.day)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${gy}-${pad(gm)}-${pad(gd)}`
}

/** Converts a Gregorian ISO date (`YYYY-MM-DD`, as stored in the database) to its Jalali calendar equivalent. */
export function gregorianIsoToJalali(isoDate: string): JalaliDate | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }
  const { jy, jm, jd } = toJalaali(Number(match[1]), Number(match[2]), Number(match[3]))
  return { year: jy, month: jm, day: jd }
}

export function todayJalali(): JalaliDate {
  const now = new Date()
  const { jy, jm, jd } = toJalaali(now)
  return { year: jy, month: jm, day: jd }
}
