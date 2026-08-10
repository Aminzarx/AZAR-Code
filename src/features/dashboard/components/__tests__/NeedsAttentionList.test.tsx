import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { NeedsAttentionList } from '../NeedsAttentionList'
import type { DashboardNeedsAttentionItem } from '../../types'

describe('NeedsAttentionList', () => {
  it('renders nothing when there are no items', async () => {
    // withTheme wraps everything in a GestureHandlerRootView, so the root
    // node itself always exists — what we're asserting is that this
    // component contributes no children of its own into that wrapper.
    const { toJSON } = await render(
      withTheme(<NeedsAttentionList items={[]} onSelect={jest.fn()} />)
    )
    expect(toJSON()?.children ?? []).toHaveLength(0)
  })

  it('renders a row per item and calls onSelect with the tapped item', async () => {
    const items: DashboardNeedsAttentionItem[] = [
      { id: 'a', label: '3 متقاضی نیازمند پیگیری', tone: 'attention', target: 'ApplicantList' },
      { id: 'b', label: '1 معامله در انتظار اقدام', tone: 'inProgress', target: 'DealList' }
    ]
    const onSelect = jest.fn()
    const { getByLabelText } = await render(
      withTheme(<NeedsAttentionList items={items} onSelect={onSelect} />)
    )

    fireEvent.press(getByLabelText('3 متقاضی نیازمند پیگیری'))
    expect(onSelect).toHaveBeenCalledWith(items[0])
  })
})
