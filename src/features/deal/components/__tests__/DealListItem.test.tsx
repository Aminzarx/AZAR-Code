import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { DealListItem } from '../DealListItem'
import type { DealWithDetails } from '../../types'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'

const DEAL: DealWithDetails = {
  id: 'deal-1',
  userId: 'user-1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  status: 'new',
  currentStage: 'negotiation',
  lostReasonId: null,
  expectedValue: null,
  nextAction: null,
  nextActionDueAt: null,
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

const REMINDER: ReminderRecord = {
  id: 'rem-1',
  userId: 'user-1',
  propertyId: null,
  applicantId: null,
  dealId: 'deal-1',
  title: 'تماس با متقاضی',
  description: null,
  remindAt: '2030-01-01T10:00:00.000Z',
  isDone: false,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

describe('DealListItem', () => {
  it('renders the property title, applicant name, and stage badge', async () => {
    const { getByText } = await render(withTheme(<DealListItem deal={DEAL} onPress={jest.fn()} />))

    expect(getByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(getByText('علی رضایی')).toBeTruthy()
    expect(getByText('مذاکره')).toBeTruthy()
  })

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<DealListItem deal={DEAL} onPress={onPress} />)
    )

    fireEvent.press(getByLabelText('آپارتمان دو خوابه - علی رضایی'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows the next-action hint when a linked reminder is provided', async () => {
    const { getByText } = await render(
      withTheme(<DealListItem deal={DEAL} nextReminder={REMINDER} onPress={jest.fn()} />)
    )

    expect(getByText(/پیگیری بعدی: تماس با متقاضی/)).toBeTruthy()
  })

  it('does not show a next-action hint when no reminder is linked', async () => {
    const { queryByText } = await render(
      withTheme(<DealListItem deal={DEAL} onPress={jest.fn()} />)
    )

    expect(queryByText(/پیگیری بعدی/)).toBeNull()
  })
})
