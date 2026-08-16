import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealDetailScreen } from '../DealDetailScreen'
import { useDealDetail } from '../../hooks/useDealDetail'
import { useDealService } from '../../hooks/useDealService'
import { useDealActivity } from '../../hooks/useDealActivity'
import { useLostReasons } from '../../hooks/useLostReasons'
import type { DealWithDetails } from '../../types'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'

jest.mock('../../hooks/useDealDetail')
jest.mock('../../hooks/useDealService')
jest.mock('../../hooks/useDealActivity')
jest.mock('../../hooks/useLostReasons')
jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { userId: 'u1' } })
}))

const mockedUseDealDetail = useDealDetail as jest.MockedFunction<typeof useDealDetail>
const mockedUseDealService = useDealService as jest.MockedFunction<typeof useDealService>
const mockedUseDealActivity = useDealActivity as jest.MockedFunction<typeof useDealActivity>
const mockedUseLostReasons = useLostReasons as jest.MockedFunction<typeof useLostReasons>
const mockUpdateNotes = jest.fn()
const mockTransitionStage = jest.fn()
const mockNavigate = jest.fn()

const DEAL: DealWithDetails = {
  id: 'deal-1',
  userId: 'u1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  status: 'new',
  currentStage: 'negotiation',
  lostReasonId: null,
  expectedValue: null,
  nextAction: null,
  nextActionDueAt: null,
  notes: null,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
  property: {
    id: 'prop-1',
    ownerId: 'u1',
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
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z'
  },
  applicant: {
    id: 'app-1',
    userId: 'u1',
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
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z'
  }
}

const REMINDER: ReminderRecord = {
  id: 'rem-1',
  userId: 'u1',
  propertyId: null,
  applicantId: null,
  dealId: 'deal-1',
  title: 'تماس با متقاضی',
  description: null,
  remindAt: '2030-01-01T10:00:00.000Z',
  reminderType: 'general',
  isDone: false,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'DealDetail', name: 'DealDetail' as const, params: { dealId: 'deal-1' } }

function mockActivity(overrides: Partial<ReturnType<typeof useDealActivity>> = {}): void {
  mockedUseDealActivity.mockReturnValue({
    stageHistory: [],
    reminders: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides
  })
}

describe('DealDetailScreen', () => {
  beforeEach(() => {
    mockUpdateNotes.mockReset()
    mockTransitionStage.mockReset()
    mockNavigate.mockReset()
    mockedUseDealService.mockReturnValue({
      updateNotes: mockUpdateNotes,
      transitionStage: mockTransitionStage
    } as never)
    mockedUseLostReasons.mockReturnValue([
      { id: 'r1', label: 'قیمت بالا', isSystemDefault: true, createdAt: '2026-08-08T00:00:00.000Z' }
    ])
    mockActivity()
  })

  it('shows the property and applicant identity, and the pipeline', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findAllByText, findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    // Property title / applicant name render twice — once in the
    // ContextHeader identity row, once in the compact summary block.
    expect(await findAllByText('آپارتمان دو خوابه')).toHaveLength(2)
    expect(await findAllByText('علی رضایی')).toHaveLength(2)
    expect(await findByText('مذاکره')).toBeTruthy()
  })

  it('shows an error state with retry when loading fails', async () => {
    const refetch = jest.fn()
    mockedUseDealDetail.mockReturnValue({
      deal: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بارگذاری معامله با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows a terminal StatusBadge for a won deal', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: { ...DEAL, currentStage: 'won' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findAllByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    // Renders once in the header StatusBadge and once inside
    // PipelineIndicator's own terminal-state StatusBadge.
    expect(await findAllByText('موفق')).toHaveLength(2)
  })

  it('does not render NextAction when no incomplete reminder is linked to this deal', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockActivity({ reminders: [{ ...REMINDER, isDone: true }] })

    const { queryByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(queryByText('قدم بعدی')).toBeNull()
  })

  it('renders NextAction and navigates to the reminder when a real incomplete reminder exists', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockActivity({ reminders: [REMINDER] })

    const { findAllByText, findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    // Renders once in NextAction and once in the Activity timeline.
    expect(await findAllByText('تماس با متقاضی')).toHaveLength(2)
    fireEvent.press(await findByText('پیگیری'))
    expect(mockNavigate).toHaveBeenCalledWith('ReminderDetail', { reminderId: 'rem-1' })
  })

  it('saves notes through the notes dialog', async () => {
    const refetch = jest.fn()
    mockUpdateNotes.mockResolvedValue({ ...DEAL, notes: 'یادداشت جدید' })
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch
    })

    const { findByText, getByLabelText, getByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('افزودن یادداشت'))
    await waitFor(() => fireEvent.changeText(getByLabelText('یادداشت'), 'یادداشت جدید'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() => expect(mockUpdateNotes).toHaveBeenCalledWith('deal-1', 'یادداشت جدید'))
    // Waits out the rest of handleSaveNotes's async chain (refetch, then
    // setIsSavingNotes(false) in `finally`) so no state update from this
    // test's render lands after RTL's automatic afterEach unmount —
    // an unflushed update there corrupts react-test-renderer's act()
    // nesting for whichever test runs next in this file.
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1))
  })

  it('navigates to CreateReminder with the deal, property, and applicant prefilled', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('افزودن پیگیری'))
    expect(mockNavigate).toHaveBeenCalledWith('CreateReminder', {
      dealId: 'deal-1',
      propertyId: 'prop-1',
      applicantId: 'app-1'
    })
  })

  it('navigates to CreateContract with the deal, property, and applicant prefilled', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('ایجاد قرارداد'))
    expect(mockNavigate).toHaveBeenCalledWith('CreateContract', {
      dealId: 'deal-1',
      propertyId: 'prop-1',
      applicantId: 'app-1'
    })
  })

  it('navigates to PropertyDetail and ApplicantDetail from the compact summary', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findAllByText, getByLabelText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    await findAllByText('آپارتمان دو خوابه')
    fireEvent.press(getByLabelText('آپارتمان دو خوابه'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
    )

    fireEvent.press(getByLabelText('علی رضایی'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('ApplicantDetail', { applicantId: 'app-1' })
    )
  })

  it('advances the deal to the next stage', async () => {
    const refetch = jest.fn()
    mockTransitionStage.mockResolvedValue({ ...DEAL, currentStage: 'offer' })
    mockedUseDealDetail.mockReturnValue({ deal: DEAL, isLoading: false, error: null, refetch })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('پیشرفت به «پیشنهاد قیمت»'))

    await waitFor(() =>
      expect(mockTransitionStage).toHaveBeenCalledWith('deal-1', 'offer', 'u1', {
        lostReasonId: undefined
      })
    )
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })

  it('marks the deal as won', async () => {
    mockTransitionStage.mockResolvedValue({ ...DEAL, currentStage: 'won' })
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('موفق'))

    await waitFor(() =>
      expect(mockTransitionStage).toHaveBeenCalledWith('deal-1', 'won', 'u1', {
        lostReasonId: undefined
      })
    )
  })

  it('marks the deal as lost with the selected reason via the lost-reason dialog', async () => {
    mockTransitionStage.mockResolvedValue({ ...DEAL, currentStage: 'lost' })
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('ناموفق'))
    fireEvent.press(await findByText('قیمت بالا'))
    fireEvent.press(await findByText('ثبت به‌عنوان ناموفق'))

    await waitFor(() =>
      expect(mockTransitionStage).toHaveBeenCalledWith('deal-1', 'lost', 'u1', {
        lostReasonId: 'r1'
      })
    )
  })

  it('does not show stage-transition actions for a terminal deal', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: { ...DEAL, currentStage: 'won' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { queryByText, queryAllByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    // 'موفق' still legitimately appears twice for a won deal — the header
    // StatusBadge and PipelineIndicator's own terminal badge (see 'shows a
    // terminal StatusBadge for a won deal' above) — so this only checks no
    // *third* occurrence (a stray stage-action button) was added.
    expect(queryAllByText('موفق')).toHaveLength(2)
    expect(queryByText('ناموفق')).toBeNull()
  })
})
