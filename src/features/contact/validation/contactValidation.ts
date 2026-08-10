import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'
import type { ContactFormErrors, ContactFormValues } from '../types'

export type ValidatedContactInput = {
  fullName: string
  phoneNumber: string
  roles: ContactFormValues['roles']
  notes: string | null
}

/**
 * A Contact must have a real name, a valid Iranian mobile number
 * (canonicalized to +98..., §24), and at least one role — a role-less
 * Contact can't be used anywhere in the CRM (crm-architecture-audit-v1.md
 * §C.2 / Screen Map §1.b).
 */
export function validateContactForm(
  values: ContactFormValues
): { input: ValidatedContactInput; errors: null } | { input: null; errors: ContactFormErrors } {
  const errors: ContactFormErrors = {}

  if (values.fullName.trim().length === 0) {
    errors.fullName = 'نام الزامی است.'
  }

  const canonicalPhone = canonicalizeIranPhoneNumber(values.phoneNumber)
  if (!canonicalPhone) {
    errors.phoneNumber = 'شماره موبایل معتبر ایران وارد کنید (مثلاً 09121234567).'
  }

  if (values.roles.length === 0) {
    errors.roles = 'حداقل یک نقش را انتخاب کنید.'
  }

  if (Object.keys(errors).length > 0) {
    return { input: null, errors }
  }

  return {
    input: {
      fullName: values.fullName.trim(),
      phoneNumber: canonicalPhone as string,
      roles: values.roles,
      notes: values.notes.trim() || null
    },
    errors: null
  }
}
