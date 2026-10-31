import React from 'react'
import { Linking, Platform } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { checkForUpdate } from '@infrastructure/updates/updateService'
import { clearDownloadedUpdates } from '@infrastructure/updates/updateDownloader'
import { UpdateChecker } from '../UpdateChecker'

jest.mock('@infrastructure/updates/updateService', () => ({
  checkForUpdate: jest.fn()
}))
jest.mock('@infrastructure/updates/updateDownloader', () => ({
  clearDownloadedUpdates: jest.fn(() => Promise.resolve())
}))

const mockCheck = checkForUpdate as jest.MockedFunction<typeof checkForUpdate>
const mockClear = clearDownloadedUpdates as jest.MockedFunction<typeof clearDownloadedUpdates>

const UPDATE = {
  version: '9.0.0',
  downloadUrl: 'https://api.zarandix.ir/app/eyvan-9.0.0.apk',
  sha256: 'a'.repeat(64),
  releaseNotes: 'رنگ و فونت تازه'
}

describe('UpdateChecker (1.5.20, update through the browser — Navid #6717)', () => {
  const originalOS = Platform.OS
  let openURL: jest.SpyInstance

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true })
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => originalOS, configurable: true })
    openURL.mockRestore()
    jest.clearAllMocks()
  })

  it('shows nothing and frees the old in-app downloads when nothing is newer', async () => {
    mockCheck.mockResolvedValue(null)
    const { queryByText } = await render(withTheme(<UpdateChecker />))

    await waitFor(() => expect(mockCheck).toHaveBeenCalled())
    expect(mockClear).toHaveBeenCalled()
    expect(queryByText('نسخهٔ تازه آماده است')).toBeNull()
  })

  it('offers «دریافت» with the notes when a newer version exists', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    const { findByText } = await render(withTheme(<UpdateChecker />))

    expect(await findByText('نسخهٔ تازه آماده است')).toBeTruthy()
    expect(await findByText(/رنگ و فونت تازه/)).toBeTruthy()
    expect(await findByText(/اطلاعات شما روی گوشی دست نمی‌خورد/)).toBeTruthy()
  })

  it('«دریافت» opens the download link in the browser and closes', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    const { findByText, queryByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('دریافت'))

    expect(openURL).toHaveBeenCalledWith(UPDATE.downloadUrl)
    await waitFor(() => expect(queryByText('نسخهٔ تازه آماده است')).toBeNull())
  })

  it('«بعداً» hides it without opening anything', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    const { findByText, queryByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('بعداً'))

    expect(openURL).not.toHaveBeenCalled()
    await waitFor(() => expect(queryByText('نسخهٔ تازه آماده است')).toBeNull())
  })
})
