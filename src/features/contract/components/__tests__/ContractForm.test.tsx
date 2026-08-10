import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ContractForm } from '../ContractForm'
import type { ContractFormValues } from '../../types'

const EMPTY_VALUES: ContractFormValues = {
  type: '',
  amount: '',
  startDate: '',
  endDate: '',
  notes: ''
}

describe('ContractForm', () => {
  it('calls onChange with the field and new value', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ContractForm values={EMPTY_VALUES} errors={{}} onChange={onChange} />)
    )

    fireEvent.changeText(getByLabelText('نوع قرارداد'), 'اجاره')
    expect(onChange).toHaveBeenCalledWith('type', 'اجاره')
  })

  it('shows field-level error messages', async () => {
    const { getByText } = await render(
      withTheme(
        <ContractForm
          values={EMPTY_VALUES}
          errors={{ startDate: 'تاریخ شروع را وارد کنید.' }}
          onChange={jest.fn()}
        />
      )
    )

    expect(getByText('تاریخ شروع را وارد کنید.')).toBeTruthy()
  })
})
