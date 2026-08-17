import type { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import type { Property, PropertyFormValues } from '../types'
import { validatePropertyForm } from './propertyValidation'
import { PropertyValidationError } from './PropertyValidationError'

/** Thin business-rule wrapper around PropertyRepository — the UI never calls the repository directly. */
export class PropertyService {
  constructor(
    private readonly repository: PropertyRepository,
    private readonly generateId: () => string
  ) {}

  async createProperty(ownerId: string, values: PropertyFormValues): Promise<Property> {
    const { input, errors } = validatePropertyForm(values)
    if (!input) {
      throw new PropertyValidationError(errors)
    }
    return this.repository.create({ id: this.generateId(), ownerId, ...input })
  }

  async updateProperty(
    id: string,
    values: PropertyFormValues,
    status: Property['status']
  ): Promise<Property> {
    const { input, errors } = validatePropertyForm(values)
    if (!input) {
      throw new PropertyValidationError(errors)
    }
    return this.repository.update(id, { ...input, status })
  }

  async listProperties(ownerId: string, search?: string): Promise<Property[]> {
    return this.repository.findAllByOwner(ownerId, search)
  }

  async getProperty(id: string): Promise<Property | null> {
    return this.repository.findById(id)
  }

  async countProperties(ownerId: string): Promise<number> {
    return this.repository.countByOwner(ownerId)
  }

  async deleteProperty(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
