/**
 * Suggestion lists for the free-text property/transaction-type fields
 * (see propertyValidation.ts / applicantValidation.ts — these stay
 * unconstrained free text, no DB enum). Used only to power
 * AutocompleteInput's suggestions and matchingService's transaction-type
 * compatibility map; typing something outside these lists is always
 * allowed.
 */
export const PROPERTY_TYPES = ['آپارتمان', 'ویلایی', 'زمین', 'مغازه', 'دفتر'] as const

/** What a property listing itself is: for sale, for rent, or mortgage+rent. */
export const PROPERTY_TRANSACTION_TYPES = ['فروش', 'اجاره', 'رهن و اجاره'] as const

/** What an applicant is looking to do — the buyer/tenant side of the same transaction. */
export const APPLICANT_TRANSACTION_TYPES = ['خرید', 'اجاره', 'رهن و اجاره'] as const
