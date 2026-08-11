import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PropertyForm } from '../PropertyForm'
import type { PropertyFormValues } from '../../types'

const EMPTY_VALUES: PropertyFormValues = {
  title: '',
  propertyType: '',
  transactionType: '',
  city: '',
  address: '',
  price: '',
  area: '',
  rooms: '',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  description: ''
}

describe('PropertyForm', () => {
  it('calls onChange with the field and new value', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<PropertyForm values={EMPTY_VALUES} errors={{}} onChange={onChange} />)
    )

    fireEvent.changeText(getByLabelText('عنوان فایل'), 'آپارتمان جدید')
    expect(onChange).toHaveBeenCalledWith('title', 'آپارتمان جدید')
  })

  it('shows field-level error messages', async () => {
    const { getByText } = await render(
      withTheme(
        <PropertyForm
          values={EMPTY_VALUES}
          errors={{ title: 'عنوان الزامی است.' }}
          onChange={jest.fn()}
        />
      )
    )

    expect(getByText('عنوان الزامی است.')).toBeTruthy()
  })
})
