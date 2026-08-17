/**
 * Normalizes Persian/Arabic free text for comparison purposes (matching,
 * autocomplete, typo correction) — not for display. Collapses the two
 * most common sources of "same word, different bytes" in Persian input:
 * Arabic-vs-Persian Yeh/Kaf (keyboards and pasted text mix both) and
 * inconsistent whitespace/ZWNJ usage (e.g. "می‌خواهم" vs "می خواهم").
 */
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** Converts ASCII digits in a string (e.g. a formatted mm:ss countdown) to Persian glyphs. */
export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)])
}

// Arabic-Indic digits (١٢٣...) show up from some keyboards/IMEs alongside
// the Persian ones (۱۲۳...) — both must normalize to ASCII so typed input
// is never rejected just because of which digit glyphs the keyboard sent.
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/**
 * Converts Persian or Arabic-Indic digits in a string to ASCII — the
 * inverse of `toPersianDigits`, used so every numeric/date input in the
 * app accepts Persian and English digits completely interchangeably.
 */
export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit)
    if (persianIndex !== -1) {
      return String(persianIndex)
    }
    return String(ARABIC_INDIC_DIGITS.indexOf(digit))
  })
}

export function normalizePersianText(input: string): string {
  return input
    .replace(/ي/g, 'ی') // Arabic Yeh -> Persian Yeh (ي -> ی)
    .replace(/ك/g, 'ک') // Arabic Kaf -> Persian Keh (ك -> ک)
    .replace(/[ً-ْ]/g, '') // strip Arabic diacritics (harakat)
    .replace(/‌/g, ' ') // ZWNJ -> space, so "نیم‌فاصله" spacing doesn't affect comparison
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Classic edit-distance DP — small inputs only (form fields, city names), no need for a faster algorithm. */
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const distances: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0))

  for (let i = 0; i < rows; i++) distances[i]![0] = i
  for (let j = 0; j < cols; j++) distances[0]![j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1,
        distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + cost
      )
    }
  }

  return distances[rows - 1]![cols - 1]!
}

/**
 * Finds the closest candidate to `input` by normalized edit distance, for
 * typo correction/suggestion (e.g. "آبارتمان" -> "آپارتمان"). Returns null
 * when nothing is close enough to be a confident correction — an unrelated
 * word should never get silently rewritten.
 */
export function findClosestMatch(
  input: string,
  candidates: readonly string[],
  maxDistance = 2
): string | null {
  const normalizedInput = normalizePersianText(input)
  if (!normalizedInput) {
    return null
  }

  let best: { candidate: string; distance: number } | null = null
  for (const candidate of candidates) {
    const distance = levenshteinDistance(normalizedInput, normalizePersianText(candidate))
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { candidate, distance }
    }
  }
  return best?.candidate ?? null
}

/** Ranked substring/typo suggestions for autocomplete dropdowns — exact prefix matches first, then fuzzy ones. */
export function suggestMatches(input: string, candidates: readonly string[], limit = 5): string[] {
  const normalizedInput = normalizePersianText(input)
  if (!normalizedInput) {
    return candidates.slice(0, limit)
  }

  const prefixMatches = candidates.filter((candidate) =>
    normalizePersianText(candidate).startsWith(normalizedInput)
  )
  const containsMatches = candidates.filter(
    (candidate) =>
      !prefixMatches.includes(candidate) &&
      normalizePersianText(candidate).includes(normalizedInput)
  )
  const fuzzyMatches = candidates.filter(
    (candidate) =>
      !prefixMatches.includes(candidate) &&
      !containsMatches.includes(candidate) &&
      levenshteinDistance(normalizedInput, normalizePersianText(candidate)) <= 2
  )

  return [...prefixMatches, ...containsMatches, ...fuzzyMatches].slice(0, limit)
}
