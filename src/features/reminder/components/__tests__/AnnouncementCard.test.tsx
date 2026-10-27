import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { AnnouncementCard } from '../AnnouncementCard'

describe('AnnouncementCard (Amin #5370)', () => {
  it('shows the title and text, and × dismisses it', async () => {
    const onDismiss = jest.fn()
    const { getByText, getByLabelText } = await render(
      withTheme(
        <AnnouncementCard
          announcement={{ id: 'a1', title: 'نسخهٔ تازه', body: 'ایوان به‌روز شد.', tone: 'success', createdAt: '2026-10-27T10:00:00Z' }}
          onDismiss={onDismiss}
        />
      )
    )
    expect(getByText('نسخهٔ تازه')).toBeTruthy()
    expect(getByText('ایوان به‌روز شد.')).toBeTruthy()
    fireEvent.press(getByLabelText('بستن اعلان نسخهٔ تازه'))
    expect(onDismiss).toHaveBeenCalled()
  })
})
