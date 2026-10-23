import * as fs from 'node:fs'
import * as path from 'node:path'
import { getDatabase, closeDatabase } from '@infrastructure/database/connection'
import { PropertyRepository } from '@infrastructure/database/repositories/PropertyRepository'
import { ApplicantRepository } from '@infrastructure/database/repositories/ApplicantRepository'
import { DealRepository } from '@infrastructure/database/repositories/DealRepository'
import { ContractRepository } from '@infrastructure/database/repositories/ContractRepository'
import { ReminderRepository } from '@infrastructure/database/repositories/ReminderRepository'
import { fetchDashboardData } from '../dashboardDataService'

const DB_FILE = path.join(process.cwd(), `azar.test-${process.env.JEST_WORKER_ID}.db`)
const USER_ID = 'user-1'
const OTHER_USER_ID = 'user-2'

describe('fetchDashboardData', () => {
  afterEach(() => {
    closeDatabase()
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE)
    }
  })

  async function seedUsers(): Promise<void> {
    const db = await getDatabase()
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000000', 'REF00001', '2026-08-08', '2026-08-08')`,
      [USER_ID]
    )
    await db.execute(
      `INSERT INTO users (id, phone_number, referral_code, created_at, updated_at)
       VALUES (?, '09120000001', 'REF00002', '2026-08-08', '2026-08-08')`,
      [OTHER_USER_ID]
    )
  }

  it('returns zero counts and no activity for a user with no data', async () => {
    await seedUsers()

    const result = await fetchDashboardData(USER_ID)

    expect(result.stats).toEqual([
      { id: 'properties', label: 'فایل ملکی', value: 0 },
      { id: 'applicants', label: 'متقاضی', value: 0 },
      { id: 'contracts', label: 'قرارداد فعال', value: 0 },
      { id: 'deals', label: 'پیگیری باز', value: 0 }
    ])
    expect(result.followUps).toEqual([])
    expect(result.hasOverdue).toBe(false)
    expect(result.matches).toEqual({ matchCount: 0, applicantCount: 0 })
  })

  it('returns real counts scoped to the requesting user only', async () => {
    await seedUsers()
    const db = await getDatabase()
    const propertyRepository = new PropertyRepository(db)
    const applicantRepository = new ApplicantRepository(db)
    const dealRepository = new DealRepository(db)

    const property = await propertyRepository.create({
      id: 'prop-1',
      ownerId: USER_ID,
      title: 'آپارتمان دو خوابه',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'خیابان ولیعصر',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    const applicant = await applicantRepository.create({
      id: 'app-1',
      userId: USER_ID,
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: null,
      applicantType: null,
      preferredTransactionType: null,
      preferredPropertyType: null,
      city: 'تهران',
      minBudget: null,
      maxBudget: null,
      minArea: null,
      maxArea: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: null
    })
    await dealRepository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: property.id,
      applicantId: applicant.id
    })

    // Data belonging to a different user must not leak into these counts.
    await propertyRepository.create({
      id: 'prop-2',
      ownerId: OTHER_USER_ID,
      title: 'ملک کاربر دیگر',
      propertyType: null,
      transactionType: null,
      city: 'شیراز',
      address: 'آدرس',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })

    const result = await fetchDashboardData(USER_ID)

    expect(result.stats).toEqual([
      { id: 'properties', label: 'فایل ملکی', value: 1 },
      { id: 'applicants', label: 'متقاضی', value: 1 },
      { id: 'contracts', label: 'قرارداد فعال', value: 0 },
      { id: 'deals', label: 'پیگیری باز', value: 1 }
    ])
    // Same city is already a suitable file for the matching engine.
    expect(result.matches).toEqual({ matchCount: 1, applicantCount: 1 })
  })

  it('does not count a cancelled deal toward active deals', async () => {
    await seedUsers()
    const db = await getDatabase()
    const propertyRepository = new PropertyRepository(db)
    const applicantRepository = new ApplicantRepository(db)
    const dealRepository = new DealRepository(db)

    const property = await propertyRepository.create({
      id: 'prop-1',
      ownerId: USER_ID,
      title: 'آپارتمان',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    const applicant = await applicantRepository.create({
      id: 'app-1',
      userId: USER_ID,
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: null,
      applicantType: null,
      preferredTransactionType: null,
      preferredPropertyType: null,
      city: 'تهران',
      minBudget: null,
      maxBudget: null,
      minArea: null,
      maxArea: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: null
    })
    const deal = await dealRepository.create({
      id: 'deal-1',
      userId: USER_ID,
      propertyId: property.id,
      applicantId: applicant.id
    })
    await dealRepository.updateStatus(deal.id, 'cancelled')

    const result = await fetchDashboardData(USER_ID)
    expect(result.stats.find((stat) => stat.id === 'deals')?.value).toBe(0)
  })

  it('does not count a cancelled contract toward active contracts', async () => {
    await seedUsers()
    const db = await getDatabase()
    const propertyRepository = new PropertyRepository(db)
    const applicantRepository = new ApplicantRepository(db)
    const contractRepository = new ContractRepository(db)

    const property = await propertyRepository.create({
      id: 'prop-1',
      ownerId: USER_ID,
      title: 'آپارتمان',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    const applicant = await applicantRepository.create({
      id: 'app-1',
      userId: USER_ID,
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: null,
      applicantType: null,
      preferredTransactionType: null,
      preferredPropertyType: null,
      city: 'تهران',
      minBudget: null,
      maxBudget: null,
      minArea: null,
      maxArea: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: null
    })
    const contract = await contractRepository.create({
      id: 'con-1',
      userId: USER_ID,
      propertyId: property.id,
      applicantId: applicant.id,
      dealId: null,
      type: null,
      amount: null,
      startDate: '2026-09-01',
      endDate: '2027-09-01',
      notes: null,
      trackingCode: null
    })
    await contractRepository.update(contract.id, {
      type: null,
      status: 'cancelled',
      amount: null,
      startDate: contract.startDate,
      endDate: contract.endDate,
      notes: null,
      trackingCode: null
    })

    const result = await fetchDashboardData(USER_ID)
    expect(result.stats.find((stat) => stat.id === 'contracts')?.value).toBe(0)
  })

  it('lists overdue and today follow-ups with the applicant phone, not later ones', async () => {
    await seedUsers()
    const db = await getDatabase()
    const applicantRepository = new ApplicantRepository(db)
    const reminderRepository = new ReminderRepository(db)
    const now = new Date(2026, 9, 23, 9, 0)

    const applicant = await applicantRepository.create({
      id: 'app-1',
      userId: USER_ID,
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: null,
      applicantType: null,
      preferredTransactionType: null,
      preferredPropertyType: null,
      city: 'تهران',
      minBudget: null,
      maxBudget: null,
      minArea: null,
      maxArea: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: null
    })
    const base = {
      userId: USER_ID,
      propertyId: null,
      dealId: null,
      description: null,
      reminderType: 'general' as const
    }
    await reminderRepository.create({
      ...base,
      id: 'rem-overdue',
      applicantId: applicant.id,
      title: 'تماس با متقاضی',
      remindAt: new Date(2026, 9, 21, 10, 0).toISOString()
    })
    await reminderRepository.create({
      ...base,
      id: 'rem-today',
      applicantId: null,
      title: 'بازدید آپارتمان',
      remindAt: new Date(2026, 9, 23, 17, 15).toISOString()
    })
    await reminderRepository.create({
      ...base,
      id: 'rem-tomorrow',
      applicantId: null,
      title: 'فردا',
      remindAt: new Date(2026, 9, 24, 10, 0).toISOString()
    })

    const result = await fetchDashboardData(USER_ID, now)

    expect(result.followUps.map((item) => item.id)).toEqual(['rem-overdue', 'rem-today'])
    expect(result.followUps[0]).toMatchObject({
      subtitle: 'علی رضایی',
      timeLabel: '۲ روز پیش',
      isOverdue: true,
      phoneNumber: '09121234567'
    })
    expect(result.followUps[1]).toMatchObject({ isOverdue: false, phoneNumber: null })
    expect(result.hasOverdue).toBe(true)
  })

  it('leaves archived applicants out of the matching count', async () => {
    await seedUsers()
    const db = await getDatabase()
    const propertyRepository = new PropertyRepository(db)
    const applicantRepository = new ApplicantRepository(db)

    await propertyRepository.create({
      id: 'prop-1',
      ownerId: USER_ID,
      title: 'آپارتمان',
      propertyType: null,
      transactionType: null,
      city: 'تهران',
      address: 'آدرس',
      price: null,
      area: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      barterItems: [],
      barterOtherDescription: null,
      description: null
    })
    const applicant = await applicantRepository.create({
      id: 'app-1',
      userId: USER_ID,
      fullName: 'علی رضایی',
      phoneNumber: '09121234567',
      email: null,
      applicantType: null,
      preferredTransactionType: null,
      preferredPropertyType: null,
      city: 'تهران',
      minBudget: null,
      maxBudget: null,
      minArea: null,
      maxArea: null,
      rooms: null,
      depositAmount: null,
      rentAmount: null,
      isConvertible: false,
      description: null
    })
    await db.execute(`UPDATE applicants SET status = 'archived' WHERE id = ?`, [applicant.id])

    const result = await fetchDashboardData(USER_ID)

    expect(result.matches).toEqual({ matchCount: 0, applicantCount: 0 })
  })
})
