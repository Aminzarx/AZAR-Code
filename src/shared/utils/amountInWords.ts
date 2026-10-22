/**
 * v3.0.0 (Amin #4180): a price in Persian words under the money field
 * («هشت میلیارد و پانصد میلیون تومان»), so a broker sees at a glance
 * whether a zero is missing.
 */
const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده'
]
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد']

function belowThousand(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) parts.push(HUNDREDS[h] ?? '')
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10] ?? '')
  } else {
    const t = Math.floor(rest / 10)
    const o = rest % 10
    if (t) parts.push(TENS[t] ?? '')
    if (o) parts.push(ONES[o] ?? '')
  }
  return parts.join(' و ')
}

/** Plain digits in, words out; '' for empty, zero or a number too large to name. */
export function amountInWords(rawDigits: string, unit = 'تومان'): string {
  const digits = rawDigits.replace(/^0+/, '')
  if (!digits || digits.length > 15) {
    return ''
  }
  const groups: number[] = []
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(Number(digits.slice(Math.max(0, end - 3), end)))
  }
  const parts: string[] = []
  groups.forEach((g, i) => {
    if (!g) return
    const scale = SCALES[groups.length - 1 - i] ?? ''
    parts.push(scale ? `${belowThousand(g)} ${scale}` : belowThousand(g))
  })
  return `${parts.join(' و ')} ${unit}`.trim()
}
