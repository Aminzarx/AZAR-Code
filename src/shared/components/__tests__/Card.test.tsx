import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { Card } from '../Card'
import { withTheme } from '../testHelpers'

describe('Card', () => {
  it('renders its children', async () => {
    const { getByText } = await render(
      withTheme(
        <Card>
          <Text>محتوای کارت</Text>
        </Card>
      )
    )
    expect(getByText('محتوای کارت')).toBeTruthy()
  })

  it('renders detail and listItem variants without crashing', async () => {
    const { getByText: getDetail } = await render(
      withTheme(
        <Card variant="detail">
          <Text>جزئیات</Text>
        </Card>
      )
    )
    expect(getDetail('جزئیات')).toBeTruthy()

    const { getByText: getListItem } = await render(
      withTheme(
        <Card variant="listItem">
          <Text>ردیف فهرست</Text>
        </Card>
      )
    )
    expect(getListItem('ردیف فهرست')).toBeTruthy()
  })
})
