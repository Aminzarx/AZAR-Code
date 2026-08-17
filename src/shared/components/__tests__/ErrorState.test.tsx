import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { ErrorState } from '../ErrorState'
import { withTheme } from '../testHelpers'

describe('ErrorState', () => {
  it('renders title and description', async () => {
    const { getByText } = await render(
      withTheme(<ErrorState title="بازیابی ناموفق بود" description="فایل پشتیبان خراب است." />)
    )
    expect(getByText('بازیابی ناموفق بود')).toBeTruthy()
    expect(getByText('فایل پشتیبان خراب است.')).toBeTruthy()
  })

  it('renders and triggers the optional retry action', async () => {
    const onRetry = jest.fn()
    const { getByText } = await render(
      withTheme(<ErrorState title="خطا" retryLabel="تلاش دوباره" onRetry={onRetry} />)
    )
    fireEvent.press(getByText('تلاش دوباره'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
