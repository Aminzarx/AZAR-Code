import React from 'react'
import { Clipboard, Share } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SettingsScreen } from '../SettingsScreen'

const mockLogout = jest.fn()
const mockFindById = jest.fn()
const mockCreateBackupFile = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'AZARSEED', sessionToken: 't1' },
    logout: mockLogout
  })
}))

jest.mock('@infrastructure/database/connection', () => ({
  getDatabase: () => Promise.resolve({})
}))

jest.mock('@infrastructure/database/repositories/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => ({
    findById: (...args: unknown[]) => mockFindById(...args)
  }))
}))

jest.mock('@infrastructure/backup/BackupService', () => ({
  createBackupFile: (...args: unknown[]) => mockCreateBackupFile(...args)
}))

const navigationProp = {} as never
const routeProp = { key: 'Settings', name: 'Settings' as const, params: undefined }

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockLogout.mockReset()
    mockFindById.mockReset()
    mockFindById.mockResolvedValue({
      id: 'u1',
      phoneNumber: '+989121234567',
      referralCode: 'AZARSEED',
      createdAt: '',
      updatedAt: ''
    })
    jest.spyOn(Clipboard, 'setString').mockImplementation(() => undefined)
    mockCreateBackupFile.mockReset()
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows the referral code', async () => {
    const { findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect((await findByLabelText('کد معرف شما')).props.children).toBe('AZARSEED')
  })

  it('shows the phone number once loaded', async () => {
    const { findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('+989121234567')).toBeTruthy()
  })

  it('copies the referral code to the clipboard', async () => {
    const { findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('کپی کد معرف'))
    expect(Clipboard.setString).toHaveBeenCalledWith('AZARSEED')
  })

  it('asks for confirmation before logging out and does not log out on cancel', async () => {
    const { findByText, queryByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('خروج از حساب'))
    expect(
      await findByText('آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟')
    ).toBeTruthy()

    fireEvent.press(await findByText('انصراف'))
    await waitFor(() =>
      expect(queryByText('آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟')).toBeNull()
    )
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('logs out only after confirming in the dialog', async () => {
    const { findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('خروج از حساب'))
    fireEvent.press(await findByText('خروج'))

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
  })

  it('creates and shares a backup once a password is entered', async () => {
    mockCreateBackupFile.mockResolvedValue('/mock/caches/azar-backup-20260810-120000.azarbackup')
    const { findByText, findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('تهیه نسخه پشتیبان'))
    fireEvent.changeText(await findByLabelText('رمز عبور'), 'a strong password')
    fireEvent.press(await findByText('تهیه و اشتراک‌گذاری'))

    await waitFor(() => expect(mockCreateBackupFile).toHaveBeenCalledWith({}, 'a strong password'))
    await waitFor(() =>
      expect(Share.share).toHaveBeenCalledWith({
        url: 'file:///mock/caches/azar-backup-20260810-120000.azarbackup',
        title: 'نسخه پشتیبان آزار'
      })
    )
  })

  it('shows an error and keeps the dialog open when backup creation fails', async () => {
    mockCreateBackupFile.mockRejectedValue(new Error('disk full'))
    const { findByText, findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('تهیه نسخه پشتیبان'))
    fireEvent.changeText(await findByLabelText('رمز عبور'), 'a strong password')
    fireEvent.press(await findByText('تهیه و اشتراک‌گذاری'))

    expect(await findByText('تهیه نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.')).toBeTruthy()
    expect(Share.share).not.toHaveBeenCalled()
  })
})
