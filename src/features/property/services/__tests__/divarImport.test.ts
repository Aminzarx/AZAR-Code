import { divarLinkIn, divarToValues } from '../divarImport'
import type { DivarPost } from '@infrastructure/sync/syncApiClient'
import type { PropertyFormValues } from '../../types'

const EMPTY: PropertyFormValues = {
  title: '',
  propertyType: '',
  transactionType: '',
  city: 'کرج',
  region: '',
  address: '',
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

// Navid #5653 sample post, as the server reads it
const POST: DivarPost = {
  token: 'gaffwOpk',
  title: '۱۴۲متر/دریاچه‌ چیتگر/فول امکانات/تهاتر',
  propertyType: 'آپارتمان',
  transactionTypes: ['فروش', 'تهاتر'],
  city: 'تهران',
  region: 'دریاچه شهدای خلیج فارس',
  price: 3976000000,
  deposit: null,
  rent: null,
  area: 142,
  rooms: 3,
  yearBuilt: 1405,
  floor: '۲۶ از بیشتر از ۳۰',
  features: ['آسانسور', 'پارکینگ'],
  description: 'برج با امکانات رفاهی. قابل تهاتر و یا معاوضه با : مسکونی زمین خودرو،باغ',
  photos: []
}

describe('divarLinkIn', () => {
  it('finds the link in the text Divar shares', () => {
    expect(divarLinkIn('ببین این آگهی رو\nhttps://divar.ir/v/gaffwOpk')).toBe('https://divar.ir/v/gaffwOpk')
    expect(divarLinkIn('divar.ir/v/gaffwOpk')).toBe('https://divar.ir/v/gaffwOpk')
    expect(divarLinkIn('https://sheypoor.com/v/abc')).toBeNull()
  })
})

describe('divarToValues', () => {
  it('fills a new file from the post', () => {
    const v = divarToValues(POST, EMPTY)
    expect(v.title).toBe(POST.title)
    expect(v.propertyType).toBe('آپارتمان')
    expect(v.transactionType).toBe('فروش، تهاتر')
    expect(v.city).toBe('تهران')
    expect(v.region).toBe('دریاچه شهدای خلیج فارس')
    expect(v.price).toBe('3976000000')
    expect(v.area).toBe('142')
    expect(v.rooms).toBe('3')
    expect(v.description).toBe(`سال ساخت: ۱۴۰۵\nطبقه: ۲۶ از بیشتر از ۳۰\nامکانات: آسانسور، پارکینگ\n\n${POST.description}`)
    // the post's own words pick the barter items
    expect(v.barterItems).toEqual(['خودرو', 'زمین', 'ملک'])
  })

  it('keeps what the broker had where the post says nothing', () => {
    const v = divarToValues({ ...POST, city: '', price: null, features: [], yearBuilt: null, floor: null }, EMPTY)
    expect(v.city).toBe('کرج')
    expect(v.price).toBe('')
    expect(v.description).toBe(POST.description)
  })
})
