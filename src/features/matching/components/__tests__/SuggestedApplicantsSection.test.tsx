import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SuggestedApplicantsSection } from '../SuggestedApplicantsSection'
import { useApplicantMatchesForProperty } from '../../hooks/useApplicantMatchesForProperty'
import { useDealService } from '@features/deal/hooks/useDealService'
import type { Applicant } from '@features/applicant/types'
import type { Property } from '@features/property/types'

jest.mock('../../hooks/useApplicantMatchesForProperty')
jest.mock('@features/deal/hooks/useDealService')

const mockedUseApplicantMatches = useApplicantMatchesForProperty as jest.MockedFunction<
  typeof useApplicantMatchesForProperty
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

describe('SuggestedApplicantsSection', () => {
  beforeEach(() => {
    mockedUseApplicantMatches.mockReset()
    mockCreateDeal.mockReset()
    mockedUseDealService.mockReturnValue({ createDeal: mockCreateDeal } as never)
  })

  it('shows the empty state when there are no matches', async () => {
    mockedUseApplicantMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(
        <SuggestedApplicantsSection
          property={PROPERTY}
          onSelectApplicant={jest.fn()}
          onDealCreated={jest.fn()}
          onViewAll={jest.fn()}
        />
      )
    )

    expect(await findByText('فعلاً پیشنهادی وجود ندارد')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUseApplicantMatches.mockReturnValue({
      matches: null,
      isLoading: false,
      error: new Error('خطا'),
      refetch
    })

    const { findByText } = await render(
      withTheme(
        <SuggestedApplicantsSection
          property={PROPERTY}
          onSelectApplicant={jest.fn()}
          onDealCreated={jest.fn()}
          onViewAll={jest.fn()}
        />
      )
    )

    expect(await findByText('محاسبه پیشنهادها با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders matches with score and reason, and calls onSelectApplicant when pressed', async () => {
    const onSelectApplicant = jest.fn()
    mockedUseApplicantMatches.mockReturnValue({
      matches: [{ applicant: APPLICANT, score: 25, matchedCriteria: ['city'] }],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, findByLabelText } = await render(
      withTheme(
        <SuggestedApplicantsSection
          property={PROPERTY}
          onSelectApplicant={onSelectApplicant}
          onDealCreated={jest.fn()}
          onViewAll={jest.fn()}
        />
      )
    )

    expect(await findByText('علی رضایی')).toBeTruthy()
    expect(await findByText('25٪ تطابق')).toBeTruthy()
    expect(await findByText('شهر یکسان')).toBeTruthy()

    fireEvent.press(await findByLabelText('علی رضایی'))
    expect(onSelectApplicant).toHaveBeenCalledWith('app-1')
  })

  it('creates a deal and calls onDealCreated when "ایجاد پیگیری" is pressed', async () => {
    mockCreateDeal.mockResolvedValue({ id: 'deal-1' })
    const onDealCreated = jest.fn()
    mockedUseApplicantMatches.mockReturnValue({
      matches: [{ applicant: APPLICANT, score: 25, matchedCriteria: ['city'] }],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, getByText } = await render(
      withTheme(
        <SuggestedApplicantsSection
          property={PROPERTY}
          onSelectApplicant={jest.fn()}
          onDealCreated={onDealCreated}
          onViewAll={jest.fn()}
        />
      )
    )

    await findByText('ایجاد پیگیری')
    await waitFor(() => fireEvent.press(getByText('ایجاد پیگیری')))

    await waitFor(() => expect(mockCreateDeal).toHaveBeenCalledWith('user-1', 'prop-1', 'app-1'))
    await waitFor(() => expect(onDealCreated).toHaveBeenCalledWith('deal-1'))
  })

  it('calls onViewAll when "مشاهده همه" is pressed', async () => {
    const onViewAll = jest.fn()
    mockedUseApplicantMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(
        <SuggestedApplicantsSection
          property={PROPERTY}
          onSelectApplicant={jest.fn()}
          onDealCreated={jest.fn()}
          onViewAll={onViewAll}
        />
      )
    )

    fireEvent.press(await findByText('مشاهده همه'))
    expect(onViewAll).toHaveBeenCalledTimes(1)
  })
})
