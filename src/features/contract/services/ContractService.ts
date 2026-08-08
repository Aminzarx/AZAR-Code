import type { ContractRepository } from '@infrastructure/database/repositories/ContractRepository'
import type { PropertyService } from '@features/property/services/PropertyService'
import type { ApplicantService } from '@features/applicant/services/ApplicantService'
import type { Contract, ContractFormValues, ContractStatus, ContractWithDetails } from '../types'
import { validateContractForm } from '../validation/contractValidation'
import { ContractValidationError } from '../validation/ContractValidationError'

export type NewContractLinks = {
  propertyId: string
  applicantId: string
  dealId?: string | null
}

/**
 * Thin business-rule wrapper around ContractRepository, same shape as
 * DealService — including enrichment with the related property/applicant
 * via their existing services rather than duplicating lookups, since a
 * contract row itself only stores foreign keys.
 */
export class ContractService {
  constructor(
    private readonly repository: ContractRepository,
    private readonly propertyService: PropertyService,
    private readonly applicantService: ApplicantService,
    private readonly generateId: () => string
  ) {}

  async createContract(
    userId: string,
    links: NewContractLinks,
    values: ContractFormValues
  ): Promise<Contract> {
    const { input, errors } = validateContractForm(values)
    if (!input) {
      throw new ContractValidationError(errors)
    }
    return this.repository.create({
      id: this.generateId(),
      userId,
      propertyId: links.propertyId,
      applicantId: links.applicantId,
      dealId: links.dealId ?? null,
      ...input
    })
  }

  async updateContract(
    id: string,
    values: ContractFormValues,
    status: ContractStatus
  ): Promise<Contract> {
    const { input, errors } = validateContractForm(values)
    if (!input) {
      throw new ContractValidationError(errors)
    }
    return this.repository.update(id, { ...input, status })
  }

  async listContracts(userId: string): Promise<ContractWithDetails[]> {
    const contracts = await this.repository.getAll(userId)
    return Promise.all(contracts.map((contract) => this.attachDetails(contract)))
  }

  async getContract(id: string): Promise<ContractWithDetails | null> {
    const contract = await this.repository.getById(id)
    return contract ? this.attachDetails(contract) : null
  }

  async countActiveContracts(userId: string): Promise<number> {
    return this.repository.countActive(userId)
  }

  async deleteContract(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  private async attachDetails(contract: Contract): Promise<ContractWithDetails> {
    const [property, applicant] = await Promise.all([
      this.propertyService.getProperty(contract.propertyId),
      this.applicantService.getApplicant(contract.applicantId)
    ])
    return { ...contract, property, applicant }
  }
}
