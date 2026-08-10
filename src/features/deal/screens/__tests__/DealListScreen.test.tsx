import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealListScreen } from '../DealListScreen'
import { useDeals } from '../../hooks/useDeals'
import { useIncompleteReminders } from '../../hooks/useIncompleteReminders'
import type { DealWithDetails } from '../../types'

const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useDeals')
jest.mock('../../hooks/useIncompleteReminders')

const mockedUseDeals = useDeals as jest.MockedFunction<typeof useDeals>
const mockedUseIncompleteReminders = useIncompleteReminders as jest.MockedFunction<
  typeof useIncompleteReminders
>

function makeDeal(overrides: Partial<DealWithDetails>): DealWithDetails {
  return {
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
    },
    ...overrides
  }
}

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'DealList', name: 'DealList' as const, params: undefined }

describe('DealListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockedUseDeals.mockReset()
    mockedUseIncompleteReminders.mockReturnValue({ reminders: [], refetch: jest.fn() })
  })

  it('shows the empty state when there are no deals', async () => {
    mockedUseDeals.mockReturnValue({
      deals: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<DealListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('هنوز معامله‌ای ثبت نشده')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUseDeals.mockReturnValue({
      deals: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<DealListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('بارگذاری معامله‌ها با مشکل مواجه شد')).toBeTruthy()

    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates to DealDetail when a deal is pressed', async () => {
    mockedUseDeals.mockReturnValue({
      deals: [makeDeal({})],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<DealListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('آپارتمان دو خوابه - علی رضایی'))
    expect(mockNavigate).toHaveBeenCalledWith('DealDetail', { dealId: 'deal-1' })
  })

  it('filters the list by the selected pipeline segment', async () => {
    mockedUseDeals.mockReturnValue({
      deals: [
        makeDeal({ id: 'deal-new', currentStage: 'new' }),
        makeDeal({
          id: 'deal-won',
          currentStage: 'won',
          property: { ...makeDeal({}).property!, title: 'آپارتمان برنده' }
        })
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, queryByText } = await render(
      withTheme(<DealListScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(await findByText('آپارتمان برنده')).toBeTruthy()

    fireEvent.press(await findByText('موفق'))

    await waitFor(() => expect(queryByText('آپارتمان دو خوابه')).toBeNull())
    expect(await findByText('آپارتمان برنده')).toBeTruthy()
  })
})
