import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SuggestedPropertiesSection } from '../SuggestedPropertiesSection'
import { usePropertyMatchesForApplicant } from '../../hooks/usePropertyMatchesForApplicant'
import type { Applicant } from '@features/applicant/types'
import type { Property } from '@features/property/types'

jest.mock('../../hooks/usePropertyMatchesForApplicant')

const mockedUsePropertyMatches = usePropertyMatchesForApplicant as jest.MockedFunction<
  typeof usePropertyMatchesForApplicant
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

describe('SuggestedPropertiesSection', () => {
  beforeEach(() => {
    mockedUsePropertyMatches.mockReset()
  })

  it('shows the empty state when there are no matches', async () => {
    mockedUsePropertyMatches.mockReturnValue({
      matches: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<SuggestedPropertiesSection applicant={APPLICANT} onSelectProperty={jest.fn()} />)
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
      withTheme(<SuggestedPropertiesSection applicant={APPLICANT} onSelectProperty={jest.fn()} />)
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
        <SuggestedPropertiesSection applicant={APPLICANT} onSelectProperty={onSelectProperty} />
      )
    )

    expect(await findByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(await findByText('25٪ تطابق')).toBeTruthy()
    expect(await findByText('شهر یکسان')).toBeTruthy()

    fireEvent.press(await findByLabelText('آپارتمان دو خوابه'))
    expect(onSelectProperty).toHaveBeenCalledWith('prop-1')
  })
})
