import type { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import type { Applicant, ApplicantFormValues } from '../types'
import { validateApplicantForm } from '../validation/applicantValidation'
import { ApplicantValidationError } from '../validation/ApplicantValidationError'

/**
 * `email`/`applicantType` were removed from the applicant form (forms
 * polish brief §4) — the DB columns stay (schema/migrations are out of
 * scope here), so every write explicitly nulls them instead of leaving a
 * dangling required field on the repository's create/update input.
 */
const REMOVED_FIELDS = { email: null, applicantType: null } as const

/** Thin business-rule wrapper around ApplicantRepository — the UI never calls the repository directly. */
export class ApplicantService {
  constructor(
    private readonly repository: ApplicantRepository,
    private readonly generateId: () => string
  ) {}

  async createApplicant(userId: string, values: ApplicantFormValues): Promise<Applicant> {
    const { input, errors } = validateApplicantForm(values)
    if (!input) {
      throw new ApplicantValidationError(errors)
    }
    return this.repository.create({
      id: this.generateId(),
      userId,
      ...input,
      ...REMOVED_FIELDS
    })
  }

  async updateApplicant(
    id: string,
    values: ApplicantFormValues,
    status: Applicant['status']
  ): Promise<Applicant> {
    const { input, errors } = validateApplicantForm(values)
    if (!input) {
      throw new ApplicantValidationError(errors)
    }
    return this.repository.update(id, { ...input, ...REMOVED_FIELDS, status })
  }

  async listApplicants(userId: string, search?: string): Promise<Applicant[]> {
    if (search && search.trim().length > 0) {
      return this.repository.search(userId, search)
    }
    return this.repository.getAll(userId)
  }

  async getApplicant(id: string): Promise<Applicant | null> {
    return this.repository.getById(id)
  }

  async countApplicants(userId: string): Promise<number> {
    return this.repository.countByUser(userId)
  }

  async deleteApplicant(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
