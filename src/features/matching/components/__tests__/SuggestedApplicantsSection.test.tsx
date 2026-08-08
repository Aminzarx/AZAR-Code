import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SuggestedApplicantsSection } from '../SuggestedApplicantsSection'
import { useApplicantMatchesForProperty } from '../../hooks/useApplicantMatchesForProperty'
import type { Applicant } from '@features/applicant/types'
import type { Property } from '@features/property/types'

jest.mock('../../hooks/useApplicantMatchesForProperty')

const mockedUseApplicantMatches = useApplicantMatchesForProperty as jest.MockedFunction<
  typeof useApplicantMatchesForProperty
>

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
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

describe('SuggestedApplicantsSection', () => {
  beforeEach(() => {
    mockedUseApplicantMatches.mockReset()
  })

  it('shows the empty state when there are no matches', async () => {
    mockedUseApplicantMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<SuggestedApplicantsSection property={PROPERTY} onSelectApplicant={jest.fn()} />)
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
      withTheme(<SuggestedApplicantsSection property={PROPERTY} onSelectApplicant={jest.fn()} />)
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
        <SuggestedApplicantsSection property={PROPERTY} onSelectApplicant={onSelectApplicant} />
      )
    )

    expect(await findByText('علی رضایی')).toBeTruthy()
    expect(await findByText('25٪ تطابق')).toBeTruthy()
    expect(await findByText('شهر یکسان')).toBeTruthy()

    fireEvent.press(await findByLabelText('علی رضایی'))
    expect(onSelectApplicant).toHaveBeenCalledWith('app-1')
  })
})
