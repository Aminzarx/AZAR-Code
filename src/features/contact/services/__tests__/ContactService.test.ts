import { open, type DB } from '@op-engineering/op-sqlite'
import { runMigrations } from '@infrastructure/database/migrationRunner'
import { ContactRepository } from '@infrastructure/database/repositories/ContactRepository'
import { ContactService } from '../ContactService'
import { ContactValidationError } from '../../validation/ContactValidationError'
import type { ContactFormValues } from '../../types'

const USER_ID = 'user-1'

const VALID_VALUES: ContactFormValues = {
  fullName: 'رضا محمدی',
  phoneNumber: '09121234567',
  roles: ['owner'],
  notes: ''
}

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `contact-${idCounter}`
}

describe('ContactService', () => {
  let db: DB
  let service: ContactService

  beforeEach(async () => {
    db = open({ name: `test-contact-service-${Math.random()}.db`, location: ':memory:' })
    db.executeSync('PRAGMA foreign_keys = ON')
    await runMigrations(db)
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    idCounter = 0
    service = new ContactService(new ContactRepository(db), generateId)
  })

  afterEach(() => {
    db.close()
  })

  it('creates a contact from valid form values, canonicalizing the phone number', async () => {
    const contact = await service.createContact(USER_ID, VALID_VALUES)
    expect(contact.fullName).toBe('رضا محمدی')
    expect(contact.phoneNumber).toBe('+989121234567')
    expect(contact.roles).toEqual(['owner'])
  })

  it('throws ContactValidationError when no role is selected', async () => {
    await expect(service.createContact(USER_ID, { ...VALID_VALUES, roles: [] })).rejects.toThrow(
      ContactValidationError
    )
  })

  it('throws ContactValidationError for an invalid phone number', async () => {
    await expect(
      service.createContact(USER_ID, { ...VALID_VALUES, phoneNumber: '123' })
    ).rejects.toThrow(ContactValidationError)
  })

  it('supports a contact holding multiple roles at once', async () => {
    const contact = await service.createContact(USER_ID, {
      ...VALID_VALUES,
      roles: ['owner', 'seller']
    })
    expect(contact.roles).toEqual(expect.arrayContaining(['owner', 'seller']))
    expect(contact.roles).toHaveLength(2)
  })

  it('lists and searches contacts', async () => {
    await service.createContact(USER_ID, VALID_VALUES)
    await service.createContact(USER_ID, {
      ...VALID_VALUES,
      fullName: 'سارا احمدی',
      phoneNumber: '09359876543',
      roles: ['buyer']
    })

    expect(await service.listContacts(USER_ID)).toHaveLength(2)
    expect(await service.listContacts(USER_ID, 'سارا')).toHaveLength(1)
  })

  it('finds a possible duplicate by canonical phone number', async () => {
    await service.createContact(USER_ID, VALID_VALUES)
    const duplicate = await service.findPossibleDuplicate(USER_ID, '09121234567')
    expect(duplicate?.fullName).toBe('رضا محمدی')
  })

  it('returns null from duplicate check when the phone number is not registered yet', async () => {
    const duplicate = await service.findPossibleDuplicate(USER_ID, '09121110000')
    expect(duplicate).toBeNull()
  })

  it('archives a contact instead of deleting it', async () => {
    const created = await service.createContact(USER_ID, VALID_VALUES)
    await service.archiveContact(created.id)
    const archived = await service.getContact(created.id)
    expect(archived?.isArchived).toBe(true)
  })

  it('updates a contact, replacing its role set', async () => {
    const created = await service.createContact(USER_ID, VALID_VALUES)
    const updated = await service.updateContact(created.id, {
      ...VALID_VALUES,
      roles: ['landlord']
    })
    expect(updated.roles).toEqual(['landlord'])
  })
})
