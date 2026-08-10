import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealDetailScreen } from '../DealDetailScreen'
import { useDealDetail } from '../../hooks/useDealDetail'
import { useDealService } from '../../hooks/useDealService'
import type { DealWithDetails } from '../../types'

jest.mock('../../hooks/useDealDetail')
jest.mock('../../hooks/useDealService')

const mockedUseDealDetail = useDealDetail as jest.MockedFunction<typeof useDealDetail>
const mockedUseDealService = useDealService as jest.MockedFunction<typeof useDealService>
const mockUpdateStatus = jest.fn()
const mockUpdateNotes = jest.fn()
const mockNavigate = jest.fn()

const DEAL: DealWithDetails = {
  id: 'deal-1',
  userId: 'u1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  status: 'new',
  currentStage: 'new',
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
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z'
  }
}

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'DealDetail', name: 'DealDetail' as const, params: { dealId: 'deal-1' } }

describe('DealDetailScreen', () => {
  beforeEach(() => {
    mockUpdateStatus.mockReset()
    mockUpdateNotes.mockReset()
    mockNavigate.mockReset()
    mockedUseDealService.mockReturnValue({
      updateStatus: mockUpdateStatus,
      updateNotes: mockUpdateNotes
    } as never)
  })

  it('shows the property and applicant details', async () => {
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(await findByText('علی رضایی')).toBeTruthy()
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

    expect(await findByText('بارگذاری پیگیری با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('changes status when a status chip is pressed', async () => {
    mockUpdateStatus.mockResolvedValue({ ...DEAL, status: 'contacted' })
    const refetch = jest.fn()
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch
    })

    const { findByLabelText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    const chip = await findByLabelText('در تماس')
    await waitFor(() => fireEvent.press(chip))

    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith('deal-1', 'contacted'))
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })

  it('saves notes when the save button is pressed', async () => {
    mockUpdateNotes.mockResolvedValue({ ...DEAL, notes: 'یادداشت جدید' })
    mockedUseDealDetail.mockReturnValue({
      deal: DEAL,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { getByLabelText, getByText } = await render(
      withTheme(<DealDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('یادداشت'), 'یادداشت جدید'))
    await waitFor(() => fireEvent.press(getByText('ذخیره یادداشت')))

    await waitFor(() => expect(mockUpdateNotes).toHaveBeenCalledWith('deal-1', 'یادداشت جدید'))
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

    fireEvent.press(await findByText('افزودن یادآوری'))
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
})
