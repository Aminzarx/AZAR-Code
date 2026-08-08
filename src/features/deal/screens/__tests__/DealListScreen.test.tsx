import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealListScreen } from '../DealListScreen'
import { useDeals } from '../../hooks/useDeals'
import type { DealWithDetails } from '../../types'

const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useDeals')

const mockedUseDeals = useDeals as jest.MockedFunction<typeof useDeals>

const DEAL: DealWithDetails = {
  id: 'deal-1',
  userId: 'u1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  status: 'new',
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
const routeProp = { key: 'DealList', name: 'DealList' as const, params: undefined }

describe('DealListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockedUseDeals.mockReset()
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
    expect(await findByText('هنوز پیگیری‌ای ثبت نشده')).toBeTruthy()
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
    expect(await findByText('بارگذاری پیگیری‌ها با مشکل مواجه شد')).toBeTruthy()

    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates to DealDetail when a deal is pressed', async () => {
    mockedUseDeals.mockReturnValue({
      deals: [DEAL],
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
})
