import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { SelectionListItem } from '../SelectionListItem'

describe('SelectionListItem', () => {
  it('renders title and subtitle, and calls onPress', async () => {
    const onPress = jest.fn()
    const { getByText, getByLabelText } = await render(
      withTheme(
        <SelectionListItem
          icon="files"
          title="آپارتمان ولیعصر"
          subtitle="تهران • ۵۰۰,۰۰۰,۰۰۰ تومان"
          onPress={onPress}
        />
      )
    )
    expect(getByText('آپارتمان ولیعصر')).toBeTruthy()
    expect(getByText('تهران • ۵۰۰,۰۰۰,۰۰۰ تومان')).toBeTruthy()
    fireEvent.press(getByLabelText('آپارتمان ولیعصر'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders without a subtitle', async () => {
    const { getByText, queryByText } = await render(
      withTheme(<SelectionListItem icon="person" title="محمد رضایی" onPress={jest.fn()} />)
    )
    expect(getByText('محمد رضایی')).toBeTruthy()
    expect(queryByText('undefined')).toBeNull()
  })
})
