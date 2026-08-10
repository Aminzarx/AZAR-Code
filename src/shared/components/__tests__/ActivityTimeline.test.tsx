import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { ActivityTimeline } from '../ActivityTimeline'

describe('ActivityTimeline', () => {
  it('shows an empty state when there is no activity', async () => {
    const { getByText } = await render(withTheme(<ActivityTimeline activity={[]} />))
    expect(getByText('هنوز فعالیتی ثبت نشده')).toBeTruthy()
  })

  it('renders activity items when present', async () => {
    const { getByText } = await render(
      withTheme(
        <ActivityTimeline
          activity={[
            {
              id: '1',
              title: 'پرونده جدید',
              description: 'یک پرونده ملکی اضافه شد',
              timestamp: 'امروز'
            }
          ]}
        />
      )
    )
    expect(getByText('پرونده جدید')).toBeTruthy()
    expect(getByText('یک پرونده ملکی اضافه شد')).toBeTruthy()
  })

  it('supports a custom empty title/description', async () => {
    const { getByText } = await render(
      withTheme(
        <ActivityTimeline activity={[]} emptyTitle="سفارشی" emptyDescription="توضیح سفارشی" />
      )
    )
    expect(getByText('سفارشی')).toBeTruthy()
    expect(getByText('توضیح سفارشی')).toBeTruthy()
  })
})
