import type { ContactRepository } from '@infrastructure/database/repositories/ContactRepository'
import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'
import type { Contact, ContactFormValues } from '../types'
import { validateContactForm } from '../validation/contactValidation'
import { ContactValidationError } from '../validation/ContactValidationError'

/** Thin business-rule wrapper around ContactRepository — the UI never calls the repository directly. */
export class ContactService {
  constructor(
    private readonly repository: ContactRepository,
    private readonly generateId: () => string
  ) {}

  async createContact(userId: string, values: ContactFormValues): Promise<Contact> {
    const { input, errors } = validateContactForm(values)
    if (!input) {
      throw new ContactValidationError(errors)
    }
    // No email field in the form yet (§ Rule 8 — not building UI for a
    // field nothing asks for this phase); the repository column stays
    // available for when one is added, written as null until then.
    return this.repository.create({ id: this.generateId(), userId, email: null, ...input })
  }

  async updateContact(id: string, values: ContactFormValues): Promise<Contact> {
    const { input, errors } = validateContactForm(values)
    if (!input) {
      throw new ContactValidationError(errors)
    }
    return this.repository.update(id, { ...input, email: null })
  }

  async listContacts(userId: string, search?: string): Promise<Contact[]> {
    if (search && search.trim().length > 0) {
      return this.repository.search(userId, search)
    }
    return this.repository.getAll(userId)
  }

  async getContact(id: string): Promise<Contact | null> {
    return this.repository.getById(id)
  }

  /**
   * Non-blocking duplicate check (§20) — the UI shows a warning and lets
   * the user proceed or open the existing contact instead; this never
   * throws, so it's safe to call speculatively (e.g. on phone-field blur)
   * before the rest of the form is even valid.
   */
  async findPossibleDuplicate(userId: string, phoneNumber: string): Promise<Contact | null> {
    const canonicalPhone = canonicalizeIranPhoneNumber(phoneNumber)
    if (!canonicalPhone) {
      return null
    }
    return this.repository.findByPhoneNumber(userId, canonicalPhone)
  }

  async archiveContact(id: string): Promise<void> {
    return this.repository.archive(id)
  }
}
