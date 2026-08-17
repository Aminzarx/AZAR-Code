import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PropertyListItem } from '../PropertyListItem'
import type { Property } from '../../types'

const PROPERTY: Property = {
  id: 'prop-1',
  ownerId: 'user-1',
  title: 'آپارتمان دو خوابه',
  propertyType: 'آپارتمان',
  transactionType: 'فروش',
  city: 'تهران',
  address: 'خیابان ولیعصر',
  price: 5000000000,
  area: 120,
  rooms: 2,
  depositAmount: null,
  rentAmount: null,
  isConvertible: false,
  barterItems: [],
  barterOtherDescription: null,
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

describe('PropertyListItem', () => {
  it('renders the title, location, and price', async () => {
    const { getByText } = await render(
      withTheme(<PropertyListItem property={PROPERTY} onPress={jest.fn()} />)
    )

    expect(getByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(getByText('تهران • خیابان ولیعصر')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<PropertyListItem property={PROPERTY} onPress={onPress} />)
    )

    fireEvent.press(getByLabelText('آپارتمان دو خوابه'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
