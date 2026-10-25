import { toPersianDigits } from './persianText'

/**
 * v1.3.0 (design batch 2, Amin #4180): list cards show a broker's short
 * reading of a price («۸٫۵ میلیارد», «۴۵ میلیون») instead of the full
 * ten-digit number; the detail page still shows the exact amount.
 */
const SCALES: readonly { size: number; name: string }[] = [
  { size: 1_000_000_000, name: 'میلیارد' },
  { size: 1_000_000, name: 'میلیون' },
  { size: 1_000, name: 'هزار' }
]

function oneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return toPersianDigits(text).replace('.', '٫')
}

/** «۸٫۵ میلیارد», «۴۵ میلیون», «۸۵۰ هزار», «۹۰۰» — no unit. */
export function shortAmount(amount: number): string {
  for (const scale of SCALES) {
    if (Math.abs(amount) >= scale.size) {
      return `${oneDecimal(amount / scale.size)} ${scale.name}`
    }
  }
  return toPersianDigits(String(amount))
}

/** «۸٫۵ میلیارد تومان». */
export function shortToman(amount: number): string {
  return `${shortAmount(amount)} تومان`
}

/**
 * «۷ تا ۹ میلیارد تومان» when both ends share a scale, otherwise
 * «۸۰۰ میلیون تا ۱٫۲ میلیارد تومان»; one end alone reads «تا ۹ …» / «از ۷ …».
 */
export function shortTomanRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) {
    return null
  }
  if (min === null) {
    return `تا ${shortToman(max as number)}`
  }
  if (max === null || max === min) {
    return max === null ? `از ${shortToman(min)}` : shortToman(min)
  }
  const minText = shortAmount(min)
  const maxText = shortAmount(max)
  const minScale = minText.split(' ')[1]
  const maxScale = maxText.split(' ')[1]
  if (minScale && minScale === maxScale) {
    return `${minText.split(' ')[0]} تا ${maxText} تومان`
  }
  return `${minText} تا ${maxText} تومان`
}

/** «امروز», «دیروز», «۳ روز پیش», «هفتهٔ پیش», «۲ هفته پیش», «۳ ماه پیش». */
export function relativeDay(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp)
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000)
  if (days <= 0) {
    return 'امروز'
  }
  if (days === 1) {
    return 'دیروز'
  }
  if (days < 7) {
    return `${toPersianDigits(String(days))} روز پیش`
  }
  if (days < 14) {
    return 'هفتهٔ پیش'
  }
  if (days < 30) {
    return `${toPersianDigits(String(Math.floor(days / 7)))} هفته پیش`
  }
  if (days < 365) {
    return `${toPersianDigits(String(Math.floor(days / 30)))} ماه پیش`
  }
  return `${toPersianDigits(String(Math.floor(days / 365)))} سال پیش`
}

/**
 * A card's money line: the sale price, or «رهن ۲ میلیارد · اجاره ۴۵ میلیون»
 * for a rental (a zero side is left out), or null when nothing is set.
 */
export function moneyLine(
  price: number | null,
  depositAmount: number | null,
  rentAmount: number | null
): string | null {
  // Amin #5240: a file for sale and for رهن و اجاره shows both (unused amounts are cleared when a file is saved)
  const parts = [
    price !== null && price > 0 ? shortToman(price) : null,
    depositAmount ? `رهن ${shortAmount(depositAmount)}` : null,
    rentAmount ? `اجاره ${shortAmount(rentAmount)}` : null
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}
