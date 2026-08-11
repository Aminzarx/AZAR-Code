import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ContractListItem } from '../ContractListItem'
import type { ContractWithDetails } from '../../types'

const CONTRACT: ContractWithDetails = {
  id: 'con-1',
  userId: 'user-1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  dealId: null,
  type: 'اجاره',
  status: 'active',
  amount: 500000000,
  startDate: '2026-09-01',
  endDate: '2027-09-01',
  notes: null,
  trackingCode: null,
  calendarEventId: null,
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
}

describe('ContractListItem', () => {
  it('renders the property title and applicant name', async () => {
    const { getByText } = await render(
      withTheme(<ContractListItem contract={CONTRACT} onPress={jest.fn()} />)
    )

    expect(getByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(getByText('علی رضایی')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ContractListItem contract={CONTRACT} onPress={onPress} />)
    )

    fireEvent.press(getByLabelText('آپارتمان دو خوابه - علی رضایی'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
