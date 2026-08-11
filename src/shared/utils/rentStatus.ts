/** Whether a free-text transaction type is some flavor of رهن/اجاره — the deposit/rent fields only make sense to show for those, not برای فروش/تهاتر/خرید. */
export function isRentOrMortgageTransaction(transactionType: string): boolean {
  const trimmed = transactionType.trim()
  return trimmed.includes('رهن') || trimmed.includes('اجاره')
}

/**
 * "رهن"/"اجاره" are two independent amounts, not one price — an explicit
 * rent of 0 alongside a real deposit means the listing is deposit-only
 * ("رهن کامل"), and the reverse (deposit 0, real rent) means rent-only
 * ("فقط اجاره"). `null` means the field was never filled in at all, which
 * is a different, unremarkable state — only an explicit `0` is meaningful
 * here, so this never fires for a listing that simply didn't use these
 * fields (e.g. a for-sale property).
 */
export function deriveRentStatusLabel(
  depositAmount: number | null,
  rentAmount: number | null
): string | null {
  if (rentAmount === 0 && depositAmount !== null && depositAmount > 0) {
    return 'رهن کامل'
  }
  if (depositAmount === 0 && rentAmount !== null && rentAmount > 0) {
    return 'فقط اجاره'
  }
  return null
}
