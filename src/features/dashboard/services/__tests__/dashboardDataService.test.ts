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
      { id: 'properties', label: 'فایل‌های ملکی', value: '0' },
      { id: 'applicants', label: 'متقاضیان', value: '0' },
      { id: 'deals', label: 'پیگیری‌های فعال', value: '0' },
      { id: 'contracts', label: 'قراردادهای فعال', value: '0' }
    ])
    expect(result.needsAttention).toEqual([])
    expect(result.recentActivity).toEqual([])
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
      description: null
    })

    const result = await fetchDashboardData(USER_ID)

    expect(result.stats).toEqual([
      { id: 'properties', label: 'فایل‌های ملکی', value: '1' },
      { id: 'applicants', label: 'متقاضیان', value: '1' },
      { id: 'deals', label: 'پیگیری‌های فعال', value: '1' },
      { id: 'contracts', label: 'قراردادهای فعال', value: '0' }
    ])
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
    expect(result.stats.find((stat) => stat.id === 'deals')?.value).toBe('0')
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
    expect(result.stats.find((stat) => stat.id === 'contracts')?.value).toBe('0')
  })

  it('builds recent activity from real property/applicant/deal records', async () => {
    await seedUsers()
    const db = await getDatabase()
    const propertyRepository = new PropertyRepository(db)
    const applicantRepository = new ApplicantRepository(db)

    await propertyRepository.create({
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
      description: null
    })
    await applicantRepository.create({
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

    const result = await fetchDashboardData(USER_ID)

    expect(result.recentActivity).toHaveLength(2)
    expect(result.recentActivity.map((item) => item.id).sort()).toEqual([
      'applicant-app-1',
      'property-prop-1'
    ])
    expect(result.recentActivity.find((item) => item.id === 'property-prop-1')?.title).toBe(
      'فایل ملکی جدید: آپارتمان دو خوابه'
    )
    expect(result.recentActivity.find((item) => item.id === 'applicant-app-1')?.title).toBe(
      'متقاضی جدید: علی رضایی'
    )
    expect(result.recentActivity.find((item) => item.id === 'property-prop-1')).toEqual(
      expect.objectContaining({ entityType: 'property', entityId: 'prop-1' })
    )
    expect(result.recentActivity.find((item) => item.id === 'applicant-app-1')).toEqual(
      expect.objectContaining({ entityType: 'applicant', entityId: 'app-1' })
    )
  })

  it('includes a needs-attention row for an overdue applicant reminder', async () => {
    await seedUsers()
    const db = await getDatabase()
    const applicantRepository = new ApplicantRepository(db)
    const reminderRepository = new ReminderRepository(db)

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
    await reminderRepository.create({
      id: 'rem-1',
      userId: USER_ID,
      propertyId: null,
      applicantId: applicant.id,
      dealId: null,
      title: 'تماس با متقاضی',
      description: null,
      remindAt: '2020-01-01T00:00:00.000Z',
      reminderType: 'general'
    })

    const result = await fetchDashboardData(USER_ID)

    expect(result.needsAttention).toContainEqual({
      id: 'overdue-applicant-reminders',
      label: '1 متقاضی نیازمند پیگیری',
      tone: 'attention',
      target: 'ApplicantList'
    })
  })

  it('does not treat a future applicant reminder as needing attention', async () => {
    await seedUsers()
    const db = await getDatabase()
    const applicantRepository = new ApplicantRepository(db)
    const reminderRepository = new ReminderRepository(db)

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
    await reminderRepository.create({
      id: 'rem-1',
      userId: USER_ID,
      propertyId: null,
      applicantId: applicant.id,
      dealId: null,
      title: 'تماس با متقاضی',
      description: null,
      remindAt: '2099-01-01T00:00:00.000Z',
      reminderType: 'general'
    })

    const result = await fetchDashboardData(USER_ID)

    expect(result.needsAttention).toEqual([])
  })

  it('includes a needs-attention row for a deal awaiting action in the contract stage', async () => {
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
    await dealRepository.transitionStage(deal.id, 'contract', USER_ID)

    const result = await fetchDashboardData(USER_ID)

    expect(result.needsAttention).toContainEqual({
      id: 'deals-awaiting-action',
      label: '1 معامله در انتظار اقدام',
      tone: 'inProgress',
      target: 'DealList'
    })
  })
})
