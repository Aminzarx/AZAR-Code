import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { MatchingResult, matchTone } from '../MatchingResult'

describe('MatchingResult', () => {
  const criteria = [
    { key: 'city', label: 'شهر یکسان', matched: true },
    { key: 'budget', label: 'قیمت در محدوده بودجه', matched: true },
    { key: 'rooms', label: 'تعداد اتاق مطابق', matched: false }
  ]

  it('renders title, subtitle, and the honest match count', async () => {
    const { getByText } = await render(
      withTheme(
        <MatchingResult
          title="محمد رضایی"
          subtitle="بودجه: ۵۰۰,۰۰۰,۰۰۰ تومان"
          criteria={criteria}
        />
      )
    )
    expect(getByText('محمد رضایی')).toBeTruthy()
    expect(getByText('بودجه: ۵۰۰,۰۰۰,۰۰۰ تومان')).toBeTruthy()
    expect(getByText('2 از 3 معیار منطبق')).toBeTruthy()
  })

  it('calls onPrimaryAction when the primary action is pressed', async () => {
    const onPrimaryAction = jest.fn()
    const { getByText } = await render(
      withTheme(
        <MatchingResult
          title="محمد رضایی"
          criteria={criteria}
          primaryActionLabel="ایجاد معامله"
          onPrimaryAction={onPrimaryAction}
        />
      )
    )
    fireEvent.press(getByText('ایجاد معامله'))
    expect(onPrimaryAction).toHaveBeenCalledTimes(1)
  })
})

describe('matchTone', () => {
  it('returns positive for a high matched fraction', () => {
    expect(matchTone(4, 5)).toBe('positive')
  })

  it('returns inProgress for a moderate matched fraction', () => {
    expect(matchTone(2, 5)).toBe('inProgress')
  })

  it('returns neutral for a low matched fraction', () => {
    expect(matchTone(1, 6)).toBe('neutral')
  })

  it('returns neutral when there are no criteria at all', () => {
    expect(matchTone(0, 0)).toBe('neutral')
  })
})
