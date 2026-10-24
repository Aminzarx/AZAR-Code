import { validatePropertyForm } from '../propertyValidation'
import type { PropertyFormValues } from '../../types'

const VALID_VALUES: PropertyFormValues = {
  title: 'آپارتمان دو خوابه',
  propertyType: 'آپارتمان',
  transactionType: 'فروش',
  city: 'تهران',
  address: 'خیابان ولیعصر',
  price: '5000000000',
  area: '120',
  rooms: '2',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  barterItems: [],
  barterOtherDescription: '',
  description: ''
}

describe('validatePropertyForm', () => {
  it('accepts a fully valid form and normalizes optional fields to null', () => {
    const result = validatePropertyForm(VALID_VALUES)
    expect(result.errors).toBeNull()
    expect(result.input).toEqual({
      title: 'آپارتمان دو خوابه',
      propertyType: 'آپارتمان',
      transactionType: 'فروش',
      city: 'تهران',
      address: 'خیابان ولیعصر',
      price: 5000000000,
      area: 120,
      rooms: 2,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null,
      owner: null
    })
  })

  it('requires title, city, and address', () => {
    const result = validatePropertyForm({ ...VALID_VALUES, title: '', city: '  ', address: '' })
    expect(result.input).toBeNull()
    expect(result.errors?.title).toBeTruthy()
    expect(result.errors?.city).toBeTruthy()
    expect(result.errors?.address).toBeTruthy()
  })

  it('allows price, area, and rooms to be omitted', () => {
    const result = validatePropertyForm({ ...VALID_VALUES, price: '', area: '', rooms: '' })
    expect(result.errors).toBeNull()
    expect(result.input?.price).toBeNull()
    expect(result.input?.area).toBeNull()
    expect(result.input?.rooms).toBeNull()
  })

  it('rejects a non-numeric or non-positive price', () => {
    const nonNumeric = validatePropertyForm({ ...VALID_VALUES, price: 'abc' })
    expect(nonNumeric.errors?.price).toBeTruthy()

    const zero = validatePropertyForm({ ...VALID_VALUES, price: '0' })
    expect(zero.errors?.price).toBeTruthy()

    const negative = validatePropertyForm({ ...VALID_VALUES, area: '-5' })
    expect(negative.errors?.area).toBeTruthy()
  })
})

describe('validatePropertyForm owner (Amin #5066)', () => {
  const base = {
    title: 'ت',
    propertyType: '',
    transactionType: '',
    city: 'تهران',
    address: 'آ',
    price: '',
    area: '',
    rooms: '',
    depositAmount: '',
    rentAmount: '',
    isConvertible: false,
    barterItems: [],
    barterOtherDescription: '',
    description: ''
  }

  it('no owner typed = no owner', () => {
    expect(validatePropertyForm({ ...base, ownerName: ' ', ownerPhone: '' }).input?.owner).toBeNull()
  })

  it('a typed owner needs a name and a valid mobile', () => {
    expect(validatePropertyForm({ ...base, ownerNotes: 'کلید نزد سرایدار' }).errors).toEqual({
      ownerName: 'نام مالک را وارد کنید.',
      ownerPhone: 'شماره موبایل معتبر وارد کنید (مثلاً 09121234567).'
    })
  })

  it('Persian digits are accepted and the phone is kept canonical', () => {
    expect(
      validatePropertyForm({ ...base, ownerName: ' حسین ', ownerPhone: '۰۹۱۲۱۲۳۴۵۶۷' }).input?.owner
    ).toEqual({ fullName: 'حسین', phoneNumber: '+989121234567', notes: null })
  })
})
