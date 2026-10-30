import React from 'react'
import { Linking } from 'react-native'
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

  it('Amin #6214: tapping the card or playing its sound counts as opened; the sound opens in the phone player', async () => {
    const onOpen = jest.fn()
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { getByLabelText } = await render(
      withTheme(
        <AnnouncementCard
          announcement={{
            id: 'a2',
            title: 'پیام صوتی',
            body: 'گوش کنید.',
            tone: 'info',
            createdAt: '2026-10-30T10:00:00Z',
            media: { id: 'm1', kind: 'audio', mime: 'audio/mpeg', bytes: 10, url: '/announcements/media/m1' }
          }}
          onDismiss={jest.fn()}
          onOpen={onOpen}
        />
      )
    )
    fireEvent.press(getByLabelText('پخش صدای اعلان'))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(openURL).toHaveBeenCalledWith(expect.stringMatching(/\/announcements\/media\/m1$/))
    fireEvent.press(getByLabelText('اعلان: پیام صوتی'))
    expect(onOpen).toHaveBeenCalledTimes(2)
    openURL.mockRestore()
  })
})
