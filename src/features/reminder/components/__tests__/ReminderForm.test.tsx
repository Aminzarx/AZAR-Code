import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ReminderForm } from '../ReminderForm'
import type { ReminderFormValues } from '../../types'

const EMPTY_VALUES: ReminderFormValues = {
  title: '',
  description: '',
  date: '',
  time: '',
  reminderType: 'general'
}

describe('ReminderForm', () => {
  it('calls onChange with the field and new value', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ReminderForm values={EMPTY_VALUES} errors={{}} onChange={onChange} />)
    )

    fireEvent.changeText(getByLabelText('عنوان'), 'تماس با متقاضی')
    expect(onChange).toHaveBeenCalledWith('title', 'تماس با متقاضی')
  })

  it('shows field-level error messages', async () => {
    const { getByText } = await render(
      withTheme(
        <ReminderForm
          values={EMPTY_VALUES}
          errors={{ title: 'عنوان الزامی است.' }}
          onChange={jest.fn()}
        />
      )
    )

    expect(getByText('عنوان الزامی است.')).toBeTruthy()
  })
})
