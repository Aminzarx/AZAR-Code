import { jalaliToGregorianIso } from '@shared/utils/jalaliDate'
import { validateContractForm } from '../contractValidation'
import type { ContractFormValues } from '../../types'

const START_DATE_ISO = jalaliToGregorianIso({ year: 1405, month: 6, day: 10 })
const END_DATE_ISO = jalaliToGregorianIso({ year: 1406, month: 6, day: 10 })

const VALID_VALUES: ContractFormValues = {
  type: 'اجاره',
  amount: '500000000',
  startDate: '1405/06/10',
  endDate: '1406/06/10',
  notes: 'یادداشت',
  trackingCode: '1234567890'
}

describe('validateContractForm', () => {
  it('accepts a fully valid form and converts Jalali dates to Gregorian ISO for storage', () => {
    const result = validateContractForm(VALID_VALUES)
    expect(result.errors).toBeNull()
    expect(result.input).toEqual({
      type: 'اجاره',
      amount: 500000000,
      startDate: START_DATE_ISO,
      endDate: END_DATE_ISO,
      notes: 'یادداشت',
      trackingCode: '1234567890'
    })
  })

  it('accepts single-digit month/day the same as zero-padded', () => {
    const result = validateContractForm({ ...VALID_VALUES, startDate: '1405/6/10' })
    expect(result.errors).toBeNull()
    expect(result.input?.startDate).toBe(START_DATE_ISO)
  })

  it('accepts Persian digits identically to English digits', () => {
    const result = validateContractForm({ ...VALID_VALUES, startDate: '۱۴۰۵/۰۶/۱۰' })
    expect(result.errors).toBeNull()
    expect(result.input?.startDate).toBe(START_DATE_ISO)
  })

  it('requires a valid startDate', () => {
    const result = validateContractForm({ ...VALID_VALUES, startDate: 'not-a-date' })
    expect(result.errors?.startDate).toBeTruthy()
  })

  it('requires a valid endDate', () => {
    const result = validateContractForm({ ...VALID_VALUES, endDate: 'not-a-date' })
    expect(result.errors?.endDate).toBeTruthy()
  })

  it('rejects an impossible calendar date (Esfand 30 in a common year)', () => {
    const result = validateContractForm({ ...VALID_VALUES, startDate: '1404/12/30' })
    expect(result.errors?.startDate).toBeTruthy()
  })

  it('rejects an endDate before the startDate', () => {
    const result = validateContractForm({
      ...VALID_VALUES,
      startDate: '1406/01/01',
      endDate: '1405/01/01'
    })
    expect(result.errors?.endDate).toBeTruthy()
  })

  it('allows type, amount, notes, and trackingCode to be omitted', () => {
    const result = validateContractForm({
      ...VALID_VALUES,
      type: '',
      amount: '',
      notes: '',
      trackingCode: ''
    })
    expect(result.errors).toBeNull()
    expect(result.input?.type).toBeNull()
    expect(result.input?.amount).toBeNull()
    expect(result.input?.notes).toBeNull()
    expect(result.input?.trackingCode).toBeNull()
  })

  it('rejects a non-numeric or non-positive amount', () => {
    const nonNumeric = validateContractForm({ ...VALID_VALUES, amount: 'abc' })
    expect(nonNumeric.errors?.amount).toBeTruthy()

    const zero = validateContractForm({ ...VALID_VALUES, amount: '0' })
    expect(zero.errors?.amount).toBeTruthy()
  })
})
