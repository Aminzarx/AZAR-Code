import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ApplicantListItem } from '../ApplicantListItem'
import type { Applicant } from '../../types'

const APPLICANT: Applicant = {
  id: 'app-1',
  userId: 'user-1',
  fullName: 'علی رضایی',
  phoneNumber: '09121234567',
  email: null,
  applicantType: 'حقیقی',
  preferredTransactionType: 'فروش',
  preferredPropertyType: 'آپارتمان',
  city: 'تهران',
  minBudget: 2000000000,
  maxBudget: 5000000000,
  minArea: 80,
  maxArea: 150,
  rooms: 2,
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

describe('ApplicantListItem', () => {
  it('renders the name, location, and phone number', async () => {
    const { getByText } = await render(
      withTheme(<ApplicantListItem applicant={APPLICANT} onPress={jest.fn()} />)
    )

    expect(getByText('علی رضایی')).toBeTruthy()
    expect(getByText('تهران • 09121234567')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ApplicantListItem applicant={APPLICANT} onPress={onPress} />)
    )

    fireEvent.press(getByLabelText('علی رضایی'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
