import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealListItem } from '../DealListItem'
import type { DealWithDetails } from '../../types'

const DEAL: DealWithDetails = {
  id: 'deal-1',
  userId: 'user-1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  status: 'new',
  notes: null,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
  property: {
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
  },
  applicant: {
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
}

describe('DealListItem', () => {
  it('renders the property title, applicant name, and status label', async () => {
    const { getByText } = await render(withTheme(<DealListItem deal={DEAL} onPress={jest.fn()} />))

    expect(getByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(getByText('علی رضایی')).toBeTruthy()
    expect(getByText('جدید')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<DealListItem deal={DEAL} onPress={onPress} />)
    )

    fireEvent.press(getByLabelText('آپارتمان دو خوابه - علی رضایی'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
