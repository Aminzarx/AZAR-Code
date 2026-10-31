import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'
import { toPersianDigits } from '@shared/utils/persianText'
import type { Property } from '@features/property/types'

/**
 * Amin #6339/#6341/#6523: «اشتراک فایل محافظت‌شده». The sender picks what to keep on «تنظیمات اشتراک فایل»; only what is
 * left goes to the server (POST /share/create), which gives a one-time link valid for 1 hour. The link opens only inside
 * EYVAN: «eyvan://share?c=<code>». The receiver's app saves it as a new file marked «فایل اشتراکی».
 *
 * Pure functions only (no database, no network): the switches → the snapshot, the link ↔ the code, the texts.
 */

/** The «فایل اشتراکی» marker: a received file's id starts with this (the id is the row's sync key, so it survives sync,
 * the same way the office dashboard's files carry «office-» in theirs). */
export const SHARED_ID_PREFIX = 'shared-'
export const isSharedFileId = (id: string): boolean => id.startsWith(SHARED_ID_PREFIX)
export const SHARED_FILE_LABEL = 'فایل اشتراکی'

export const SHARE_LINK_HOURS = 1
const CODE = /^[A-Za-z0-9_-]{22,64}$/

/** the switches on «تنظیمات اشتراک فایل» */
export type ShareOptions = {
  /** پنهان کردن شمارهٔ مالک (the owner is left out altogether: no number = no contact on the other phone) */
  hideOwnerPhone: boolean
  /** جایگزینی شمارهٔ مالک با شمارهٔ من (never with hideOwnerPhone) */
  ownerAsMe: boolean
  /** پنهان کردن نام مالک (only when the real owner is shared: then the name reads «مالک») */
  hideOwnerName: boolean
  /** پنهان کردن یادداشت مالک */
  hideOwnerNotes: boolean
  hideAddress: boolean
  hidePhotos: boolean
  /** پنهان کردن توضیحات (the description and the barter «سایر» text) */
  hideDescription: boolean
  /** پنهان کردن قیمت‌ها (price, deposit, rent) */
  hidePrices: boolean
}

export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  hideOwnerPhone: true,
  ownerAsMe: false,
  hideOwnerName: false,
  hideOwnerNotes: true,
  hideAddress: false,
  hidePhotos: false,
  hideDescription: false,
  hidePrices: false
}

/** «hide the number» and «my number instead» exclude each other: turning one on turns the other off */
export function toggleOption(options: ShareOptions, key: keyof ShareOptions, value: boolean): ShareOptions {
  const next = { ...options, [key]: value }
  if (value && key === 'hideOwnerPhone') next.ownerAsMe = false
  if (value && key === 'ownerAsMe') next.hideOwnerPhone = false
  return next
}

export type SharedPhoto = { data: string; bytes: number; width: number | null; height: number | null }

/** What travels: the file's own facts, with only what the sender kept (see server/src/shareRoutes.js cleanFile). */
export type SharedFile = {
  v?: 1
  title: string
  propertyType?: string
  transactionType?: string
  city?: string
  region?: string
  address?: string
  price?: number
  area?: number
  rooms?: number
  depositAmount?: number
  rentAmount?: number
  isConvertible?: boolean
  barterItems?: string[]
  barterOtherDescription?: string
  description?: string
  /** isSender: the number is the sender's own («جایگزینی شمارهٔ مالک با شمارهٔ من») */
  owner?: { name: string; phone: string; notes?: string; isSender?: boolean }
  photos?: SharedPhoto[]
}

/** the sender, for «my number instead» */
export type ShareSender = { displayName: string | null; phoneNumber: string | null }

const text = (v: string | null | undefined): string | undefined => (v && v.trim() ? v : undefined)
const amount = (v: number | null | undefined): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined)

/**
 * The file + the switches → the snapshot to send. Nothing hidden is in it at all (not blanked: left out).
 * `photos` are the file's photos with their bytes, already read by the caller (ignored when hidden).
 */
export function buildSharedFile(property: Property, options: ShareOptions, sender: ShareSender, photos: readonly SharedPhoto[] = []): SharedFile {
  const file: SharedFile = { title: property.title }
  const put = <K extends keyof SharedFile>(k: K, v: SharedFile[K] | undefined): void => {
    if (v !== undefined) file[k] = v
  }
  put('propertyType', text(property.propertyType))
  put('transactionType', text(property.transactionType))
  put('city', text(property.city))
  put('region', text(property.region))
  if (!options.hideAddress) put('address', text(property.address))
  if (!options.hidePrices) {
    put('price', amount(property.price))
    put('depositAmount', amount(property.depositAmount))
    put('rentAmount', amount(property.rentAmount))
  }
  put('area', amount(property.area))
  put('rooms', amount(property.rooms))
  file.isConvertible = property.isConvertible
  file.barterItems = [...property.barterItems]
  if (!options.hideDescription) {
    put('description', text(property.description))
    put('barterOtherDescription', text(property.barterOtherDescription))
  }
  const owner = ownerOf(property, options, sender)
  if (owner) file.owner = owner
  if (!options.hidePhotos && photos.length > 0) file.photos = photos.map((p) => ({ ...p }))
  return file
}

function ownerOf(property: Property, options: ShareOptions, sender: ShareSender): SharedFile['owner'] | undefined {
  if (options.ownerAsMe) {
    const phone = sender.phoneNumber ? canonicalizeIranPhoneNumber(sender.phoneNumber) : null
    if (!phone) return undefined
    return { name: text(sender.displayName) ?? 'مشاور', phone, isSender: true }
  }
  if (options.hideOwnerPhone || !property.owner) return undefined
  const phone = canonicalizeIranPhoneNumber(property.owner.phoneNumber)
  if (!phone) return undefined
  const owner: NonNullable<SharedFile['owner']> = { name: options.hideOwnerName ? 'مالک' : property.owner.fullName, phone }
  if (!options.hideOwnerNotes && text(property.owner.notes)) owner.notes = property.owner.notes as string
  return owner
}

/** a short line of what the other side will (not) see, for the confirm step */
export function hiddenSummary(options: ShareOptions): string {
  const parts = [
    options.ownerAsMe ? 'شمارهٔ شما به جای شمارهٔ مالک' : options.hideOwnerPhone ? 'بدون مالک و شماره‌اش' : null,
    options.hideAddress ? 'بدون آدرس' : null,
    options.hidePhotos ? 'بدون عکس' : null,
    options.hideDescription ? 'بدون توضیحات' : null,
    options.hidePrices ? 'بدون قیمت' : null
  ].filter((p): p is string => Boolean(p))
  return parts.length ? parts.join('، ') : 'همهٔ اطلاعات فایل فرستاده می‌شود'
}

export const shareLinkOf = (code: string): string => `eyvan://share?c=${code}`

/** «eyvan://share?c=…» (scanned, pasted, opened) or the bare code → the code; anything else (an office QR…) → null */
export function shareCodeOf(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  const link = value.match(/eyvan:\/\/share\/?\?(?:[^#\s]*&)?c=([A-Za-z0-9_-]+)/)
  if (link) return CODE.test(link[1]) ? link[1] : null
  return CODE.test(value) ? value : null
}

/** the SMS / share-sheet text: one short Persian line and the link (it opens only in EYVAN) */
export function shareMessage(link: string, title: string): string {
  return `فایل «${title}» را در ایوان برایتان فرستادم. این لینک فقط در اپ ایوان باز می‌شود، یک ساعت اعتبار دارد و یک‌بار مصرف است:\n${link}`
}

/** time left until expiresAt as «۵۹:۰۸»; null once it has passed */
export function timeLeft(expiresAt: string, now: number): string | null {
  const ms = Date.parse(expiresAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return toPersianDigits(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
}
