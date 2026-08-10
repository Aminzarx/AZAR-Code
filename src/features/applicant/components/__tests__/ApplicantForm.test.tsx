import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ApplicantForm } from '../ApplicantForm'
import type { ApplicantFormValues } from '../../types'

const EMPTY_VALUES: ApplicantFormValues = {
  fullName: '',
  phoneNumber: '',
  preferredTransactionType: '',
  preferredPropertyType: '',
  city: '',
  minBudget: '',
  maxBudget: '',
  minArea: '',
  maxArea: '',
  rooms: '',
  description: ''
}

describe('ApplicantForm', () => {
  it('calls onChange with the field and new value', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ApplicantForm values={EMPTY_VALUES} errors={{}} onChange={onChange} />)
    )

    fireEvent.changeText(getByLabelText('نام و نام خانوادگی'), 'علی رضایی')
    expect(onChange).toHaveBeenCalledWith('fullName', 'علی رضایی')
  })

  it('shows field-level error messages', async () => {
    const { getByText } = await render(
      withTheme(
        <ApplicantForm
          values={EMPTY_VALUES}
          errors={{ fullName: 'نام الزامی است.' }}
          onChange={jest.fn()}
        />
      )
    )

    expect(getByText('نام الزامی است.')).toBeTruthy()
  })
})
