import { normalizePersianText } from './persianText'

/**
 * Amin #5240: a property file can be offered for sale, for رهن و اجاره and/or for barter at once, each with a step
 * of its own. The kinds are kept in the old free-text `transaction_type` column as «فروش، رهن و اجاره», so existing
 * rows, sync and export need no migration; a lone old «اجاره»/«رهن» reads as رهن و اجاره.
 */
export const DEAL_KINDS = ['فروش', 'رهن و اجاره', 'تهاتر'] as const
export type DealKind = (typeof DEAL_KINDS)[number]

const SEPARATOR = /[،,|]/

function kindOf(part: string): DealKind | null {
  const p = normalizePersianText(part)
  if (!p) return null
  if (p === normalizePersianText('فروش')) return 'فروش'
  if (p === normalizePersianText('تهاتر')) return 'تهاتر'
  if (p.includes(normalizePersianText('رهن')) || p.includes(normalizePersianText('اجاره'))) return 'رهن و اجاره'
  return null
}

/** The kinds in a stored transaction type, in the fixed order of DEAL_KINDS, without repeats. */
export function parseDealKinds(value: string | null | undefined): DealKind[] {
  const found = new Set(String(value ?? '').split(SEPARATOR).map(kindOf).filter((k): k is DealKind => k !== null))
  return DEAL_KINDS.filter((k) => found.has(k))
}

/** What is stored: the kinds in the fixed order, joined with «، ». */
export function joinDealKinds(kinds: readonly string[]): string {
  return parseDealKinds(kinds.join('،')).join('، ')
}

/**
 * Amin #5240: which property kind serves an applicant who wants `applicantType` (buy / rent / barter). A buyer is
 * never offered a rent-only or barter-only file, and so on. null = unknown applicant vocabulary.
 */
export function kindForApplicant(applicantType: string | null | undefined): DealKind | null {
  const a = normalizePersianText(applicantType ?? '')
  if (!a) return null
  if (a === normalizePersianText('خرید')) return 'فروش'
  if (a === normalizePersianText('تهاتر')) return 'تهاتر'
  if (
    a.includes(normalizePersianText('رهن')) ||
    a.includes(normalizePersianText('اجاره')) ||
    a === normalizePersianText('استیجاری')
  ) {
    return 'رهن و اجاره'
  }
  return null
}

/**
 * Amin #5327: an applicant can want several of خرید / رهن و اجاره / تهاتر at once, like a file. Kept in the same
 * `preferred_transaction_type` column joined with «، », so an old single type (or «اجاره») reads as the one chosen
 * mode — no migration, nothing lost.
 */
export const APPLICANT_KINDS = ['خرید', 'رهن و اجاره', 'تهاتر'] as const
export type ApplicantKind = (typeof APPLICANT_KINDS)[number]

const APPLICANT_KIND_FOR: Record<DealKind, ApplicantKind> = { فروش: 'خرید', 'رهن و اجاره': 'رهن و اجاره', تهاتر: 'تهاتر' }

/** The applicant's modes in a stored value, in the fixed order of APPLICANT_KINDS, without repeats. */
export function parseApplicantKinds(value: string | null | undefined): ApplicantKind[] {
  const found = new Set(
    String(value ?? '')
      .split(SEPARATOR)
      .map(kindForApplicant)
      .filter((k): k is DealKind => k !== null)
      .map((k) => APPLICANT_KIND_FOR[k])
  )
  return APPLICANT_KINDS.filter((k) => found.has(k))
}

/** What is stored for an applicant: the modes in the fixed order, joined with «، ». */
export function joinApplicantKinds(kinds: readonly string[]): string {
  return parseApplicantKinds(kinds.join('،')).join('، ')
}

/** The file kinds that serve an applicant's modes (خرید → فروش); empty = unknown vocabulary or nothing chosen. */
export function kindsForApplicant(value: string | null | undefined): DealKind[] {
  const modes = parseApplicantKinds(value)
  return DEAL_KINDS.filter((k) => modes.includes(APPLICANT_KIND_FOR[k]))
}
