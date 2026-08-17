/**
 * Suggestion lists for the free-text property/transaction-type fields
 * (see propertyValidation.ts / applicantValidation.ts — these stay
 * unconstrained free text, no DB enum). Used only to power
 * AutocompleteInput's suggestions and matchingService's transaction-type
 * compatibility map; typing something outside these lists is always
 * allowed.
 */
export const PROPERTY_TYPES = ['آپارتمان', 'ویلایی', 'زمین', 'مغازه', 'دفتر'] as const

/** What a property listing itself is: for sale, for rent, mortgage+rent, or barter/exchange. */
export const PROPERTY_TRANSACTION_TYPES = ['فروش', 'اجاره', 'رهن و اجاره', 'تهاتر'] as const

/** What an applicant is looking to do — the buyer/tenant side of the same transaction. */
export const APPLICANT_TRANSACTION_TYPES = ['خرید', 'اجاره', 'رهن و اجاره', 'تهاتر'] as const

/**
 * A فروش/اجاره property offered in تهاتر (barter) needs to say what's
 * being offered in exchange — a small fixed set of common categories,
 * plus "سایر" (other) as a free-text fallback rather than trying to
 * enumerate every possible barter item.
 */
export const BARTER_ITEM_OPTIONS = ['طلا', 'خودرو', 'زمین', 'ملک', 'سایر'] as const
