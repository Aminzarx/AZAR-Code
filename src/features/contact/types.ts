export type {
  ContactRecord as Contact,
  ContactRole
} from '@infrastructure/database/repositories/ContactRepository'
export { CONTACT_ROLES } from '@infrastructure/database/repositories/ContactRepository'

import type { ContactRole } from '@infrastructure/database/repositories/ContactRepository'

export type ContactFormValues = {
  fullName: string
  phoneNumber: string
  roles: ContactRole[]
  notes: string
}

export type ContactFormErrors = Partial<Record<'fullName' | 'phoneNumber' | 'roles', string>>
