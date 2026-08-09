import React from 'react'
import { render } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { Icon, type IconName } from '../Icon'

const ALL_NAMES: IconName[] = [
  'chevron',
  'plus',
  'check',
  'close',
  'logout',
  'home',
  'files',
  'matching',
  'contract',
  'settings',
  'copy',
  'alert',
  'inbox',
  'person',
  'calendar',
  'chevronDouble'
]

describe('Icon', () => {
  it.each(ALL_NAMES)('renders the %s glyph without crashing', async (name) => {
    const { toJSON } = await render(withTheme(<Icon name={name} />))
    expect(toJSON()).toBeTruthy()
  })

  it('is hidden from accessibility tree when no label is given', async () => {
    const { queryByLabelText } = await render(withTheme(<Icon name="home" />))
    expect(queryByLabelText('home')).toBeNull()
  })

  it('exposes an accessibilityLabel when one is provided', async () => {
    const { getByLabelText } = await render(
      withTheme(<Icon name="logout" accessibilityLabel="خروج" />)
    )
    expect(getByLabelText('خروج')).toBeTruthy()
  })
})
