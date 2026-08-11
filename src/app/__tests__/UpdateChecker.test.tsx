import React from 'react'
import { Linking } from 'react-native'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { checkForUpdate } from '@infrastructure/updates/updateService'
import { UpdateChecker } from '../UpdateChecker'

jest.mock('@infrastructure/updates/updateService', () => ({
  checkForUpdate: jest.fn()
}))

const mockCheckForUpdate = checkForUpdate as jest.MockedFunction<typeof checkForUpdate>

describe('UpdateChecker', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when no update is available', async () => {
    mockCheckForUpdate.mockResolvedValue(null)
    const { queryByText } = await render(withTheme(<UpdateChecker />))

    await waitFor(() => expect(mockCheckForUpdate).toHaveBeenCalled())
    expect(queryByText('بروزرسانی جدید موجود است')).toBeNull()
  })

  it('shows the update dialog when a newer release is found', async () => {
    mockCheckForUpdate.mockResolvedValue({
      version: '1.1.0',
      downloadUrl: 'https://example.test/azar.apk',
      releaseNotes: ''
    })
    const { findByText } = await render(withTheme(<UpdateChecker />))

    expect(await findByText('بروزرسانی جدید موجود است')).toBeTruthy()
  })

  it('opens the download URL and dismisses the dialog on confirm', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    mockCheckForUpdate.mockResolvedValue({
      version: '1.1.0',
      downloadUrl: 'https://example.test/azar.apk',
      releaseNotes: ''
    })
    const { findByText, queryByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('دانلود بروزرسانی'))

    expect(openURLSpy).toHaveBeenCalledWith('https://example.test/azar.apk')
    await waitFor(() => expect(queryByText('بروزرسانی جدید موجود است')).toBeNull())
  })

  it('dismisses the dialog without opening a URL on cancel', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    mockCheckForUpdate.mockResolvedValue({
      version: '1.1.0',
      downloadUrl: 'https://example.test/azar.apk',
      releaseNotes: ''
    })
    const { findByText, queryByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('بعدا'))

    expect(openURLSpy).not.toHaveBeenCalled()
    await waitFor(() => expect(queryByText('بروزرسانی جدید موجود است')).toBeNull())
  })
})
