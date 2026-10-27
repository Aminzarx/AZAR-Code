import type { DivarPost } from '@infrastructure/sync/syncApiClient'
import { joinDealKinds } from '@shared/utils/dealKinds'
import { toPersianDigits } from '@shared/utils/persianText'
import type { PropertyFormValues } from '../types'

const DIVAR_LINK = /divar\.ir\/v\/\S+/

/** Navid 2026-10-27: the Divar link in a shared or pasted text («… https://divar.ir/v/gaffwOpk …»), or null. */
export function divarLinkIn(text: string | null | undefined): string | null {
  const match = String(text ?? '').match(DIVAR_LINK)
  return match ? `https://${match[0]}` : null
}

const digits = (n: number | null): string => (typeof n === 'number' && n > 0 ? String(n) : '')

/**
 * Navid 2026-10-27 «ورود آگهی از دیوار»: a Divar post as the fields of a new file. What Divar does not say stays as
 * the broker had it; year built, floor and the amenities have no field of their own, so they lead the description.
 * The broker checks everything and saves.
 */
export function divarToValues(post: DivarPost, current: PropertyFormValues): PropertyFormValues {
  const facts = [
    post.yearBuilt ? `سال ساخت: ${toPersianDigits(String(post.yearBuilt))}` : '',
    post.floor ? `طبقه: ${post.floor}` : '',
    post.features.length > 0 ? `امکانات: ${post.features.join('، ')}` : ''
  ].filter(Boolean)
  const description = [facts.join('\n'), post.description.trim()].filter(Boolean).join('\n\n')
  return {
    ...current,
    title: post.title || current.title,
    propertyType: post.propertyType || current.propertyType,
    transactionType: joinDealKinds(post.transactionTypes) || current.transactionType,
    city: post.city || current.city,
    region: post.region || current.region,
    price: digits(post.price) || current.price,
    area: digits(post.area) || current.area,
    rooms: post.rooms != null ? String(post.rooms) : current.rooms,
    depositAmount: digits(post.deposit) || current.depositAmount,
    rentAmount: digits(post.rent) || current.rentAmount,
    description: description || current.description
  }
}
