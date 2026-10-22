import React from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { checkForUpdate } from '@infrastructure/updates/updateService'
import { clearDownloadedUpdates, downloadUpdate } from '@infrastructure/updates/updateDownloader'
import {
  canInstallUpdates,
  installUpdate,
  openInstallPermission
} from '@infrastructure/updates/appInstaller'
import { UpdateChecker } from '../UpdateChecker'

jest.mock('@infrastructure/updates/updateService', () => ({
  checkForUpdate: jest.fn()
}))
jest.mock('@infrastructure/updates/updateDownloader', () => ({
  downloadUpdate: jest.fn(),
  clearDownloadedUpdates: jest.fn(() => Promise.resolve())
}))
jest.mock('@infrastructure/updates/appInstaller', () => ({
  isInAppInstallSupported: () => true,
  canInstallUpdates: jest.fn(),
  installUpdate: jest.fn(() => Promise.resolve()),
  openInstallPermission: jest.fn(() => Promise.resolve())
}))

const mockCheck = checkForUpdate as jest.MockedFunction<typeof checkForUpdate>
const mockDownload = downloadUpdate as jest.MockedFunction<typeof downloadUpdate>
const mockClear = clearDownloadedUpdates as jest.MockedFunction<typeof clearDownloadedUpdates>
const mockCanInstall = canInstallUpdates as jest.MockedFunction<typeof canInstallUpdates>
const mockInstall = installUpdate as jest.MockedFunction<typeof installUpdate>
const mockOpenPermission = openInstallPermission as jest.MockedFunction<
  typeof openInstallPermission
>

const UPDATE = {
  version: '9.0.0',
  downloadUrl: 'https://api.zarandix.ir/app/azar-9.0.0.apk',
  sha256: 'a'.repeat(64),
  releaseNotes: 'رنگ و فونت تازه'
}
const PATH = '/data/files/updates/azar-9.0.0.apk'

describe('UpdateChecker (v1.2.0, in-app update — Amin #4223)', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows nothing and frees old downloads when nothing is newer', async () => {
    mockCheck.mockResolvedValue(null)
    const { queryByText } = await render(withTheme(<UpdateChecker />))

    await waitFor(() => expect(mockClear).toHaveBeenCalled())
    expect(mockDownload).not.toHaveBeenCalled()
    expect(queryByText('نسخهٔ تازه آماده است')).toBeNull()
  })

  it('downloads quietly and offers «نصب» only once the file is ready', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    mockDownload.mockResolvedValue(PATH)
    const { findByText } = await render(withTheme(<UpdateChecker />))

    expect(await findByText('نسخهٔ تازه آماده است')).toBeTruthy()
    expect(mockDownload).toHaveBeenCalledWith(UPDATE)
    expect(await findByText(/رنگ و فونت تازه/)).toBeTruthy()
    expect(await findByText(/اطلاعات شما روی گوشی دست نمی‌خورد/)).toBeTruthy()
  })

  it('shows nothing when the download failed', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    mockDownload.mockResolvedValue(null)
    const { queryByText } = await render(withTheme(<UpdateChecker />))

    await waitFor(() => expect(mockDownload).toHaveBeenCalled())
    expect(queryByText('نسخهٔ تازه آماده است')).toBeNull()
  })

  it('installs inside the app when Android already allows it', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    mockDownload.mockResolvedValue(PATH)
    mockCanInstall.mockResolvedValue(true)
    const { findByText, queryByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('نصب'))

    await waitFor(() => expect(mockInstall).toHaveBeenCalledWith(PATH))
    expect(queryByText('نسخهٔ تازه آماده است')).toBeNull()
  })

  it('«بعداً» hides it without installing', async () => {
    mockCheck.mockResolvedValue(UPDATE)
    mockDownload.mockResolvedValue(PATH)
    const { findByText, queryByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('بعداً'))

    expect(mockInstall).not.toHaveBeenCalled()
    await waitFor(() => expect(queryByText('نسخهٔ تازه آماده است')).toBeNull())
  })

  // Kept last: it replaces AppState.addEventListener, and a test rendered after it in this
  // file never runs its effect even after mockRestore (test-environment only).
  it('explains the one-time permission first, then installs on return', async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      onChange = handler as (state: AppStateStatus) => void
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>
    })
    mockCheck.mockResolvedValue(UPDATE)
    mockDownload.mockResolvedValue(PATH)
    mockCanInstall.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const { findByText } = await render(withTheme(<UpdateChecker />))

    fireEvent.press(await findByText('نصب'))
    fireEvent.press(await findByText('باز کردن تنظیمات'))
    expect(mockOpenPermission).toHaveBeenCalled()
    expect(mockInstall).not.toHaveBeenCalled()

    await act(async () => {
      onChange?.('active')
    })
    await waitFor(() => expect(mockInstall).toHaveBeenCalledWith(PATH))
    spy.mockRestore()
  })
})
