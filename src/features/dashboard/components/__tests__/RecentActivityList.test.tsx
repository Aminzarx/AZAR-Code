import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { RecentActivityList } from '../RecentActivityList'

describe('RecentActivityList', () => {
  it('shows an empty state when there is no activity', async () => {
    const { getByText } = await render(withTheme(<RecentActivityList activity={[]} />))
    expect(getByText('هنوز فعالیتی ثبت نشده')).toBeTruthy()
  })

  it('renders activity items when present', async () => {
    const { getByText } = await render(
      withTheme(
        <RecentActivityList
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
})
