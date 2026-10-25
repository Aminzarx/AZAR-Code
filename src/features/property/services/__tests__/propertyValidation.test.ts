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

  it('allows area and rooms to be omitted', () => {
    const result = validatePropertyForm({ ...VALID_VALUES, area: '', rooms: '' })
    expect(result.errors).toBeNull()
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
    transactionType: 'فروش',
    city: 'تهران',
    address: 'آ',
    price: '1000',
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

describe('validatePropertyForm deal kinds (Amin #5240)', () => {
  const rent = { depositAmount: '2000000000', rentAmount: '45000000' }

  it('needs at least one deal kind', () => {
    expect(validatePropertyForm({ ...VALID_VALUES, transactionType: '' }).errors?.transactionType).toBe(
      'نوع معامله را انتخاب کنید.'
    )
  })

  it('a sale needs a price', () => {
    expect(validatePropertyForm({ ...VALID_VALUES, price: '' }).errors?.price).toBe('قیمت فروش را وارد کنید.')
  })

  it('rent needs both amounts, not both zero, and keeps no sale price', () => {
    const missing = validatePropertyForm({ ...VALID_VALUES, transactionType: 'رهن و اجاره', price: '' })
    expect(missing.errors?.depositAmount).toBeTruthy()
    expect(missing.errors?.rentAmount).toBeTruthy()
    expect(
      validatePropertyForm({
        ...VALID_VALUES,
        transactionType: 'رهن و اجاره',
        depositAmount: '0',
        rentAmount: '0'
      }).errors?.rentAmount
    ).toBeTruthy()
    const ok = validatePropertyForm({ ...VALID_VALUES, transactionType: 'رهن و اجاره', ...rent })
    expect(ok.errors).toBeNull()
    expect(ok.input?.price).toBeNull()
    expect(ok.input?.depositAmount).toBe(2000000000)
  })

  it('barter needs an item and a value', () => {
    const result = validatePropertyForm({ ...VALID_VALUES, transactionType: 'تهاتر', price: '' })
    expect(result.errors?.barterItems).toBeTruthy()
    expect(result.errors?.price).toBe('ارزش ملک را وارد کنید.')
  })

  it('several kinds are stored together in a fixed order; fields of kinds not chosen are dropped', () => {
    const result = validatePropertyForm({
      ...VALID_VALUES,
      ...rent,
      transactionType: 'رهن و اجاره، فروش',
      barterItems: ['سایر'],
      barterOtherDescription: 'خودرو'
    })
    expect(result.errors).toBeNull()
    expect(result.input?.transactionType).toBe('فروش، رهن و اجاره')
    expect(result.input?.barterItems).toEqual([])
    expect(result.input?.barterOtherDescription).toBeNull()
  })
})
