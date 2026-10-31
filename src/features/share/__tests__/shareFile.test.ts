import {
  DEFAULT_SHARE_OPTIONS,
  buildSharedFile,
  hiddenSummary,
  isSharedFileId,
  shareCodeOf,
  shareLinkOf,
  shareMessage,
  timeLeft,
  toggleOption,
  type ShareOptions
} from '../shareFile'
import type { Property } from '@features/property/types'

const CODE = 'AbCdEfGhIjKlMnOpQrStUv_-'

const property: Property = {
  id: 'p-1',
  ownerId: 'u-1',
  title: 'آپارتمان ۱۲۰ متری ونک',
  propertyType: 'آپارتمان',
  transactionType: 'فروش',
  city: 'تهران',
  region: 'ونک',
  address: 'خیابان ملاصدرا، پلاک ۱۲',
  price: 12000000000,
  area: 120,
  rooms: 3,
  depositAmount: null,
  rentAmount: null,
  isConvertible: true,
  barterItems: ['سایر'],
  barterOtherDescription: 'یک خودروی صفر',
  description: 'نورگیر، بازسازی‌شده',
  owner: { contactId: 'c-1', fullName: 'رضا مالکی', phoneNumber: '+989121111111', notes: 'فقط عصرها' },
  status: 'active',
  createdAt: '2026-10-31T10:00:00.000Z',
  updatedAt: '2026-10-31T10:00:00.000Z'
}
const me = { displayName: 'نوید', phoneNumber: '+989122222222' }
const photo = { data: 'UklGRg==', bytes: 6, width: 4, height: 3 }
const opts = (o: Partial<ShareOptions>): ShareOptions => ({ ...DEFAULT_SHARE_OPTIONS, ...o })
const none = opts({ hideOwnerPhone: false, hideOwnerNotes: false })

describe('share link (Amin #6339/#6523)', () => {
  it('reads the code from the eyvan:// link, a pasted text around it, or the bare code', () => {
    expect(shareCodeOf(shareLinkOf(CODE))).toBe(CODE)
    expect(shareCodeOf(`فایل را ببین:\neyvan://share?c=${CODE}`)).toBe(CODE)
    expect(shareCodeOf(`  ${CODE}  `)).toBe(CODE)
    expect(shareLinkOf(CODE)).toBe(`eyvan://share?c=${CODE}`)
  })

  it('anything else is not a share: office QR, web links, short or odd codes, nothing', () => {
    expect(shareCodeOf('eyvan://office-join?c=12345678&w=x')).toBeNull()
    expect(shareCodeOf('eyvan://office-link?c=12345678')).toBeNull()
    expect(shareCodeOf(`https://kssx.ir/share?c=${CODE}`)).toBeNull()
    expect(shareCodeOf('eyvan://share?c=short')).toBeNull()
    expect(shareCodeOf('eyvan://share?c=has%20space-and-more-characters')).toBeNull()
    expect(shareCodeOf('')).toBeNull()
    expect(shareCodeOf(null)).toBeNull()
  })

  it('a received file is marked by its id', () => {
    expect(isSharedFileId('shared-123')).toBe(true)
    expect(isSharedFileId('office-123')).toBe(false)
    expect(isSharedFileId('3f2a')).toBe(false)
  })

  it('the SMS text names the file and carries the link', () => {
    const text = shareMessage(shareLinkOf(CODE), property.title)
    expect(text).toContain(property.title)
    expect(text).toContain(`eyvan://share?c=${CODE}`)
    expect(text).toContain('یک ساعت')
  })

  it('counts down in Persian digits and ends at the hour', () => {
    const at = Date.parse('2026-10-31T10:00:00.000Z')
    expect(timeLeft('2026-10-31T11:00:00.000Z', at)).toBe('۶۰:۰۰')
    expect(timeLeft('2026-10-31T11:00:00.000Z', at + 61 * 1000)).toBe('۵۸:۵۹')
    expect(timeLeft('2026-10-31T11:00:00.000Z', at + 3600 * 1000)).toBeNull()
    expect(timeLeft('not a date', at)).toBeNull()
  })
})

describe('snapshot filter (Amin #6339)', () => {
  it('by default the owner (name, number, notes) is left out entirely', () => {
    const file = buildSharedFile(property, DEFAULT_SHARE_OPTIONS, me, [photo])
    expect(file.owner).toBeUndefined()
    expect(JSON.stringify(file)).not.toContain('09121111111')
    expect(JSON.stringify(file)).not.toContain('+989121111111')
    expect(JSON.stringify(file)).not.toContain('رضا مالکی')
    expect(file.address).toBe(property.address)
    expect(file.photos).toEqual([photo])
  })

  it('«my number instead» puts the sender in the owner place, never the real owner', () => {
    const file = buildSharedFile(property, opts({ hideOwnerPhone: false, ownerAsMe: true }), me)
    expect(file.owner).toEqual({ name: 'نوید', phone: '+989122222222', isSender: true })
    expect(JSON.stringify(file)).not.toContain('+989121111111')
    expect(JSON.stringify(file)).not.toContain('فقط عصرها')
  })

  it('«my number instead» with no number of mine sends no owner at all', () => {
    expect(buildSharedFile(property, opts({ hideOwnerPhone: false, ownerAsMe: true }), { displayName: null, phoneNumber: null }).owner).toBeUndefined()
  })

  it('the real owner only when nothing hides it; name and notes can still be hidden', () => {
    expect(buildSharedFile(property, none, me).owner).toEqual({ name: 'رضا مالکی', phone: '+989121111111', notes: 'فقط عصرها' })
    expect(buildSharedFile(property, opts({ hideOwnerPhone: false, hideOwnerName: true }), me).owner).toEqual({ name: 'مالک', phone: '+989121111111' })
  })

  it('address, photos, description and prices are left out (not blanked) when hidden', () => {
    const file = buildSharedFile(property, opts({ hideAddress: true, hidePhotos: true, hideDescription: true, hidePrices: true }), me, [photo])
    for (const key of ['address', 'photos', 'description', 'barterOtherDescription', 'price', 'depositAmount', 'rentAmount', 'owner']) {
      expect(Object.keys(file)).not.toContain(key)
    }
    expect(JSON.stringify(file)).not.toContain('ملاصدرا')
    expect(file).toMatchObject({ title: property.title, city: 'تهران', region: 'ونک', area: 120, rooms: 3, barterItems: ['سایر'] })
  })

  it('never carries the phone-only fields (ids, owner id, status, dates)', () => {
    const file = buildSharedFile(property, none, me, [photo])
    for (const key of ['id', 'ownerId', 'status', 'createdAt', 'updatedAt', 'closed']) {
      expect(Object.keys(file)).not.toContain(key)
    }
    expect(Object.keys(file.owner ?? {})).not.toContain('contactId')
  })

  it('hiding the number and using mine exclude each other', () => {
    let o = toggleOption(DEFAULT_SHARE_OPTIONS, 'ownerAsMe', true)
    expect(o).toMatchObject({ ownerAsMe: true, hideOwnerPhone: false })
    o = toggleOption(o, 'hideOwnerPhone', true)
    expect(o).toMatchObject({ ownerAsMe: false, hideOwnerPhone: true })
    expect(toggleOption(o, 'hideAddress', true)).toMatchObject({ hideOwnerPhone: true, hideAddress: true })
  })

  it('says in words what goes', () => {
    expect(hiddenSummary(DEFAULT_SHARE_OPTIONS)).toContain('بدون مالک')
    expect(hiddenSummary(opts({ hideOwnerPhone: false, ownerAsMe: true, hideAddress: true }))).toBe('شمارهٔ شما به جای شمارهٔ مالک، بدون آدرس')
    expect(hiddenSummary(none)).toBe('همهٔ اطلاعات فایل فرستاده می‌شود')
  })
})
