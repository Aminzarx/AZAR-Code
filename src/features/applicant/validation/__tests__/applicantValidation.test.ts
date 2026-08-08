import { validateApplicantForm } from '../applicantValidation'
import type { ApplicantFormValues } from '../../types'

const VALID_VALUES: ApplicantFormValues = {
  fullName: 'علی رضایی',
  phoneNumber: '09121234567',
  email: 'ali@example.com',
  applicantType: 'حقیقی',
  preferredTransactionType: 'فروش',
  preferredPropertyType: 'آپارتمان',
  city: 'تهران',
  minBudget: '2000000000',
  maxBudget: '5000000000',
  minArea: '80',
  maxArea: '150',
  rooms: '2',
  description: ''
}

describe('validateApplicantForm', () => {
  it('accepts a fully valid form and normalizes optional fields to null', () => {
    const result = validateApplicantForm(VALID_VALUES)
    expect(result.errors).toBeNull()
    expect(result.input).toEqual({
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: 'ali@example.com',
      applicantType: 'حقیقی',
      preferredTransactionType: 'فروش',
      preferredPropertyType: 'آپارتمان',
      city: 'تهران',
      minBudget: 2000000000,
      maxBudget: 5000000000,
      minArea: 80,
      maxArea: 150,
      rooms: 2,
      description: null
    })
  })

  it('requires fullName, phoneNumber, and city', () => {
    const result = validateApplicantForm({
      ...VALID_VALUES,
      fullName: '',
      phoneNumber: '  ',
      city: ''
    })
    expect(result.input).toBeNull()
    expect(result.errors?.fullName).toBeTruthy()
    expect(result.errors?.phoneNumber).toBeTruthy()
    expect(result.errors?.city).toBeTruthy()
  })

  it('allows email and all numeric range fields to be omitted', () => {
    const result = validateApplicantForm({
      ...VALID_VALUES,
      email: '',
      minBudget: '',
      maxBudget: '',
      minArea: '',
      maxArea: '',
      rooms: ''
    })
    expect(result.errors).toBeNull()
    expect(result.input?.email).toBeNull()
    expect(result.input?.minBudget).toBeNull()
    expect(result.input?.maxBudget).toBeNull()
  })

  it('rejects a non-numeric or non-positive budget', () => {
    const nonNumeric = validateApplicantForm({ ...VALID_VALUES, minBudget: 'abc' })
    expect(nonNumeric.errors?.minBudget).toBeTruthy()

    const zero = validateApplicantForm({ ...VALID_VALUES, minBudget: '0' })
    expect(zero.errors?.minBudget).toBeTruthy()
  })

  it('rejects maxBudget lower than minBudget', () => {
    const result = validateApplicantForm({ ...VALID_VALUES, minBudget: '5000', maxBudget: '1000' })
    expect(result.errors?.maxBudget).toBeTruthy()
  })

  it('rejects maxArea lower than minArea', () => {
    const result = validateApplicantForm({ ...VALID_VALUES, minArea: '100', maxArea: '50' })
    expect(result.errors?.maxArea).toBeTruthy()
  })
})
