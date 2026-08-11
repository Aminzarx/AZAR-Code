import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ContractListScreen } from '../ContractListScreen'
import { useContracts } from '../../hooks/useContracts'
import type { ContractWithDetails } from '../../types'

const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useContracts')

const mockedUseContracts = useContracts as jest.MockedFunction<typeof useContracts>

const CONTRACT: ContractWithDetails = {
  id: 'con-1',
  userId: 'u1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  dealId: null,
  type: null,
  status: 'active',
  amount: null,
  startDate: '2026-09-01',
  endDate: '2027-09-01',
  notes: null,
  trackingCode: null,
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

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'ContractList', name: 'ContractList' as const, params: undefined }

describe('ContractListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockedUseContracts.mockReset()
  })

  it('shows the empty state when there are no contracts', async () => {
    mockedUseContracts.mockReturnValue({
      contracts: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ContractListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('هنوز قراردادی ثبت نشده')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUseContracts.mockReturnValue({
      contracts: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<ContractListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('بارگذاری قراردادها با مشکل مواجه شد')).toBeTruthy()

    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates to ContractDetail when a contract is pressed', async () => {
    mockedUseContracts.mockReturnValue({
      contracts: [CONTRACT],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<ContractListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('آپارتمان دو خوابه - علی رضایی'))
    expect(mockNavigate).toHaveBeenCalledWith('ContractDetail', { contractId: 'con-1' })
  })
})
