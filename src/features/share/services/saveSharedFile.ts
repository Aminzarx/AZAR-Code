import type { DB } from '@op-engineering/op-sqlite'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { PhotoRepository, type DraftPhoto } from '@infrastructure/database/repositories/PhotoRepository'
import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'
import { SHARED_ID_PREFIX, type SharedFile } from '../shareFile'

const SENDER_NOTE = 'شمارهٔ همکاری که این فایل را با ایوان فرستاد'

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)

/**
 * Amin #6339: a received file → a new file on this phone, with new ids. Its id starts with «shared-» (the «فایل اشتراکی»
 * label; the id is the sync key, so the label survives sync). The owner becomes a contact only when a number came with
 * it; photos only when they came. The normal sync then sends it to the server and charges it like any new file.
 * Returns the new file's id.
 */
export async function saveSharedFile(db: DB, userId: string, file: SharedFile, generateId: () => string): Promise<string> {
  const title = str(file?.title)
  if (!title) throw new Error('invalid_shared_file')
  const id = `${SHARED_ID_PREFIX}${generateId()}`
  const phone = file.owner ? canonicalizeIranPhoneNumber(String(file.owner.phone ?? '')) : null
  const ownerName = str(file.owner?.name)
  const notes = file.owner?.isSender ? SENDER_NOTE : str(file.owner?.notes)
  await new PropertyRepository(db).create({
    id,
    ownerId: userId,
    title,
    propertyType: str(file.propertyType),
    transactionType: str(file.transactionType),
    city: str(file.city) ?? '',
    region: str(file.region),
    address: str(file.address) ?? '',
    price: num(file.price),
    area: num(file.area),
    rooms: num(file.rooms),
    depositAmount: num(file.depositAmount),
    rentAmount: num(file.rentAmount),
    isConvertible: file.isConvertible === true,
    barterItems: Array.isArray(file.barterItems) ? file.barterItems.filter((b): b is string => typeof b === 'string') : [],
    barterOtherDescription: str(file.barterOtherDescription),
    description: str(file.description),
    owner: phone && ownerName ? { newId: generateId(), fullName: ownerName, phoneNumber: phone, notes } : null
  })
  const photos: DraftPhoto[] = (Array.isArray(file.photos) ? file.photos : [])
    .filter((p) => typeof p?.data === 'string' && p.data.length > 0)
    .map((p) => ({
      data: p.data,
      bytes: num(p.bytes) ?? Math.floor((p.data.length * 3) / 4),
      width: num(p.width) ?? 0,
      height: num(p.height) ?? 0
    }))
  if (photos.length > 0) await new PhotoRepository(db, generateId).replaceFor(userId, 'property', id, photos)
  return id
}
