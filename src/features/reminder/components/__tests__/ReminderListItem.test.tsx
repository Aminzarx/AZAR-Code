import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ReminderListItem } from '../ReminderListItem'
import type { Reminder } from '../../types'

const REMINDER: Reminder = {
  id: 'rem-1',
  userId: 'user-1',
  propertyId: null,
  applicantId: null,
  dealId: null,
  title: 'تماس با متقاضی',
  description: null,
  remindAt: '2026-09-01T14:30:00.000Z',
  reminderType: 'general',
  isDone: false,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

describe('ReminderListItem', () => {
  it('renders the title', async () => {
    const { getByText } = await render(
      withTheme(
        <ReminderListItem reminder={REMINDER} onPress={jest.fn()} onToggleDone={jest.fn()} />
      )
    )

    expect(getByText('تماس با متقاضی')).toBeTruthy()
  })

  it('calls onPress when the title is tapped', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<ReminderListItem reminder={REMINDER} onPress={onPress} onToggleDone={jest.fn()} />)
    )

    fireEvent.press(getByLabelText('تماس با متقاضی'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleDone when the checkbox is tapped', async () => {
    const onToggleDone = jest.fn()
    const { getByLabelText } = await render(
      withTheme(
        <ReminderListItem reminder={REMINDER} onPress={jest.fn()} onToggleDone={onToggleDone} />
      )
    )

    fireEvent.press(getByLabelText('علامت‌گذاری تماس با متقاضی به‌عنوان انجام‌شده'))
    expect(onToggleDone).toHaveBeenCalledTimes(1)
  })
})
