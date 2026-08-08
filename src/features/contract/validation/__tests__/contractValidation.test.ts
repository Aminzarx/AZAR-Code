import { validateContractForm } from '../contractValidation'
import type { ContractFormValues } from '../../types'

const VALID_VALUES: ContractFormValues = {
  type: 'اجاره',
  amount: '500000000',
  startDate: '2026-09-01',
  endDate: '2027-09-01',
  notes: 'یادداشت'
}

describe('validateContractForm', () => {
  it('accepts a fully valid form', () => {
    const result = validateContractForm(VALID_VALUES)
    expect(result.errors).toBeNull()
    expect(result.input).toEqual({
      type: 'اجاره',
      amount: 500000000,
      startDate: '2026-09-01',
      endDate: '2027-09-01',
      notes: 'یادداشت'
    })
  })

  it('requires a valid startDate', () => {
    const result = validateContractForm({ ...VALID_VALUES, startDate: '1404/05/20' })
    expect(result.errors?.startDate).toBeTruthy()
  })

  it('requires a valid endDate', () => {
    const result = validateContractForm({ ...VALID_VALUES, endDate: 'not-a-date' })
    expect(result.errors?.endDate).toBeTruthy()
  })

  it('rejects an impossible calendar date', () => {
    const result = validateContractForm({ ...VALID_VALUES, startDate: '2026-02-30' })
    expect(result.errors?.startDate).toBeTruthy()
  })

  it('rejects an endDate before the startDate', () => {
    const result = validateContractForm({
      ...VALID_VALUES,
      startDate: '2027-01-01',
      endDate: '2026-01-01'
    })
    expect(result.errors?.endDate).toBeTruthy()
  })

  it('allows type, amount, and notes to be omitted', () => {
    const result = validateContractForm({ ...VALID_VALUES, type: '', amount: '', notes: '' })
    expect(result.errors).toBeNull()
    expect(result.input?.type).toBeNull()
    expect(result.input?.amount).toBeNull()
    expect(result.input?.notes).toBeNull()
  })

  it('rejects a non-numeric or non-positive amount', () => {
    const nonNumeric = validateContractForm({ ...VALID_VALUES, amount: 'abc' })
    expect(nonNumeric.errors?.amount).toBeTruthy()

    const zero = validateContractForm({ ...VALID_VALUES, amount: '0' })
    expect(zero.errors?.amount).toBeTruthy()
  })
})
