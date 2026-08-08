import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { EmptyState } from '../EmptyState'
import { withTheme } from '../testHelpers'

describe('EmptyState', () => {
  it('renders title and description', async () => {
    const { getByText } = await render(
      withTheme(
        <EmptyState title="هنوز پرونده‌ای وجود ندارد" description="اولین پرونده را ایجاد کنید." />
      )
    )
    expect(getByText('هنوز پرونده‌ای وجود ندارد')).toBeTruthy()
    expect(getByText('اولین پرونده را ایجاد کنید.')).toBeTruthy()
  })

  it('renders and triggers the optional action', async () => {
    const onAction = jest.fn()
    const { getByText } = await render(
      withTheme(<EmptyState title="خالی است" actionLabel="ایجاد پرونده" onAction={onAction} />)
    )
    fireEvent.press(getByText('ایجاد پرونده'))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('renders no action when actionLabel/onAction are not provided', async () => {
    const { queryByRole } = await render(withTheme(<EmptyState title="خالی است" />))
    expect(queryByRole('button')).toBeNull()
  })
})
