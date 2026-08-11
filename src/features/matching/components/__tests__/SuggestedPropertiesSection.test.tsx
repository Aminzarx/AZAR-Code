import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SuggestedPropertiesSection } from '../SuggestedPropertiesSection'
import { usePropertyMatchesForApplicant } from '../../hooks/usePropertyMatchesForApplicant'
import { useDealService } from '@features/deal/hooks/useDealService'
import type { Applicant } from '@features/applicant/types'
import type { Property } from '@features/property/types'

jest.mock('../../hooks/usePropertyMatchesForApplicant')
jest.mock('@features/deal/hooks/useDealService')

const mockedUsePropertyMatches = usePropertyMatchesForApplicant as jest.MockedFunction<
  typeof usePropertyMatchesForApplicant
>
const mockedUseDealService = useDealService as jest.MockedFunction<typeof useDealService>
const mockCreateDeal = jest.fn()

const APPLICANT: Applicant = {
  id: 'app-1',
  userId: 'user-1',
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

const PROPERTY: Property = {
  id: 'prop-1',
  ownerId: 'user-1',
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
}

describe('SuggestedPropertiesSection', () => {
  beforeEach(() => {
    mockedUsePropertyMatches.mockReset()
    mockCreateDeal.mockReset()
    mockedUseDealService.mockReturnValue({ createDeal: mockCreateDeal } as never)
  })

  it('shows the empty state when there are no matches', async () => {
    mockedUsePropertyMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(
        <SuggestedPropertiesSection
          applicant={APPLICANT}
          onSelectProperty={jest.fn()}
          onDealCreated={jest.fn()}
        />
      )
    )

    expect(await findByText('فعلاً پیشنهادی وجود ندارد')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUsePropertyMatches.mockReturnValue({
      matches: null,
      isLoading: false,
      error: new Error('خطا'),
      refetch
    })

    const { findByText } = await render(
      withTheme(
        <SuggestedPropertiesSection
          applicant={APPLICANT}
          onSelectProperty={jest.fn()}
          onDealCreated={jest.fn()}
        />
      )
    )

    expect(await findByText('محاسبه پیشنهادها با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders matches with score and reason, and calls onSelectProperty when pressed', async () => {
    const onSelectProperty = jest.fn()
    mockedUsePropertyMatches.mockReturnValue({
      matches: [{ property: PROPERTY, score: 25, matchedCriteria: ['city'] }],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, findByLabelText } = await render(
      withTheme(
        <SuggestedPropertiesSection
          applicant={APPLICANT}
          onSelectProperty={onSelectProperty}
          onDealCreated={jest.fn()}
        />
      )
    )

    expect(await findByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(await findByText('25٪ تطابق')).toBeTruthy()
    expect(await findByText('شهر یکسان')).toBeTruthy()

    fireEvent.press(await findByLabelText('آپارتمان دو خوابه'))
    expect(onSelectProperty).toHaveBeenCalledWith('prop-1')
  })

  it('creates a deal and calls onDealCreated when "ایجاد پیگیری" is pressed', async () => {
    mockCreateDeal.mockResolvedValue({ id: 'deal-1' })
    const onDealCreated = jest.fn()
    mockedUsePropertyMatches.mockReturnValue({
      matches: [{ property: PROPERTY, score: 25, matchedCriteria: ['city'] }],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, getByText } = await render(
      withTheme(
        <SuggestedPropertiesSection
          applicant={APPLICANT}
          onSelectProperty={jest.fn()}
          onDealCreated={onDealCreated}
        />
      )
    )

    await findByText('ایجاد پیگیری')
    await waitFor(() => fireEvent.press(getByText('ایجاد پیگیری')))

    await waitFor(() => expect(mockCreateDeal).toHaveBeenCalledWith('user-1', 'prop-1', 'app-1'))
    await waitFor(() => expect(onDealCreated).toHaveBeenCalledWith('deal-1'))
  })
})
