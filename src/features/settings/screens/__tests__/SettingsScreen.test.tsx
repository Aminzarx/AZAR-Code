import React from 'react'
import { Clipboard } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SettingsScreen } from '../SettingsScreen'
import { BackupAuthenticationError } from '@infrastructure/backup/backupFile'

const mockLogout = jest.fn()
const mockSendOtp = jest.fn()
const mockVerifyOtp = jest.fn()
const mockDeleteAccount = jest.fn()
const mockFindById = jest.fn()
const mockSessionFindById = jest.fn()
const mockCreateBackupFile = jest.fn()
const mockRestoreBackupFile = jest.fn()
const mockPickBackupFileBytes = jest.fn()
const mockSaveBackupFileToDevice = jest.fn()
const mockShareBackupFile = jest.fn()
const mockGetDisplayName = jest.fn()
const mockSetDisplayName = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'AZARSEED', sessionToken: 't1' },
    logout: mockLogout,
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
    deleteAccount: mockDeleteAccount
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

jest.mock('@infrastructure/database/repositories/SessionRepository', () => ({
  SessionRepository: jest.fn().mockImplementation(() => ({
    findById: (...args: unknown[]) => mockSessionFindById(...args)
  }))
}))

jest.mock('@infrastructure/backup/BackupService', () => {
  const actual = jest.requireActual('@infrastructure/backup/BackupService')
  return {
    RestoreSchemaTooNewError: actual.RestoreSchemaTooNewError,
    createBackupFile: (...args: unknown[]) => mockCreateBackupFile(...args),
    restoreBackupFile: (...args: unknown[]) => mockRestoreBackupFile(...args)
  }
})

jest.mock('@infrastructure/backup/backupFileTransfer', () => ({
  pickBackupFileBytes: (...args: unknown[]) => mockPickBackupFileBytes(...args),
  saveBackupFileToDevice: (...args: unknown[]) => mockSaveBackupFileToDevice(...args),
  shareBackupFile: (...args: unknown[]) => mockShareBackupFile(...args)
}))

jest.mock('@shared/hooks/useDisplayName', () => ({
  useDisplayName: () => mockGetDisplayName()
}))

const navigationProp = {} as never
const routeProp = { key: 'Settings', name: 'Settings' as const, params: undefined }

async function openMenu(findByLabelText: (label: string) => Promise<any>): Promise<void> {
  fireEvent.press(await findByLabelText('گزینه‌های حساب'))
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockLogout.mockReset()
    mockSendOtp.mockReset()
    mockVerifyOtp.mockReset()
    mockDeleteAccount.mockReset()
    mockFindById.mockReset()
    mockFindById.mockResolvedValue({
      id: 'u1',
      phoneNumber: '+989121234567',
      referralCode: 'AZARSEED',
      createdAt: '',
      updatedAt: ''
    })
    mockSessionFindById.mockReset()
    mockSessionFindById.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      createdAt: '2026-08-10T12:00:00.000Z',
      expiresAt: null,
      revokedAt: null
    })
    jest.spyOn(Clipboard, 'setString').mockImplementation(() => undefined)
    mockCreateBackupFile.mockReset()
    mockRestoreBackupFile.mockReset()
    mockPickBackupFileBytes.mockReset()
    mockSaveBackupFileToDevice.mockReset()
    mockShareBackupFile.mockReset()
    mockGetDisplayName.mockReset()
    mockSetDisplayName.mockReset()
    mockGetDisplayName.mockReturnValue({
      displayName: null,
      isLoading: false,
      setDisplayName: mockSetDisplayName
    })
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

  it('shows the real session creation time, not a hardcoded status', async () => {
    const { findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText(/فعال از/)).toBeTruthy()
  })

  it('asks for confirmation before logging out and does not log out on cancel', async () => {
    const { findByLabelText, findByText, queryByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    await openMenu(findByLabelText)
    fireEvent.press(await findByLabelText('خروج از حساب'))
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
    const { findByLabelText, findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    await openMenu(findByLabelText)
    fireEvent.press(await findByLabelText('خروج از حساب'))
    fireEvent.press(await findByText('خروج'))

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
  })

  it('sends a fresh OTP and then deletes the account once the code is confirmed', async () => {
    mockSendOtp.mockResolvedValue(undefined)
    mockVerifyOtp.mockResolvedValue(undefined)
    mockDeleteAccount.mockResolvedValue(undefined)
    const { findByLabelText, findByText, getAllByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    await openMenu(findByLabelText)
    fireEvent.press(await findByLabelText('حذف حساب'))
    fireEvent.press(await findByText('ارسال کد'))

    await waitFor(() => expect(mockSendOtp).toHaveBeenCalledWith('+989121234567'))

    for (let i = 0; i < 6; i++) {
      await waitFor(() => {
        fireEvent.changeText(getAllByLabelText(`رقم ${i + 1} کد تأیید`)[0], String(i))
      })
    }
    fireEvent.press(await findByText('حذف قطعی حساب'))

    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith('+989121234567', '012345'))
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith('+989121234567'))
  })

  it('creates a backup and then saves it to the device via SAF', async () => {
    mockCreateBackupFile.mockResolvedValue('/mock/caches/azar-backup-20260810-120000.azarbackup')
    mockSaveBackupFileToDevice.mockResolvedValue(true)
    const { findByLabelText, findByText, queryByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('تهیه نسخه پشتیبان'))
    fireEvent.changeText(await findByLabelText('رمز عبور'), 'a strong password')
    fireEvent.press(await findByText('ایجاد نسخه پشتیبان'))

    await waitFor(() => expect(mockCreateBackupFile).toHaveBeenCalledWith({}, 'a strong password'))
    expect(await findByText('نسخه پشتیبان آماده است')).toBeTruthy()

    fireEvent.press(await findByText('ذخیره در دستگاه'))

    await waitFor(() =>
      expect(mockSaveBackupFileToDevice).toHaveBeenCalledWith(
        '/mock/caches/azar-backup-20260810-120000.azarbackup',
        'azar-backup-20260810-120000.azarbackup'
      )
    )
    await waitFor(() => expect(queryByText('نسخه پشتیبان آماده است')).toBeNull())
  })

  it('creates a backup and then shares it (e.g. to Telegram) via react-native-share', async () => {
    mockCreateBackupFile.mockResolvedValue('/mock/caches/azar-backup-20260810-120000.azarbackup')
    mockShareBackupFile.mockResolvedValue(true)
    const { findByLabelText, findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('تهیه نسخه پشتیبان'))
    fireEvent.changeText(await findByLabelText('رمز عبور'), 'a strong password')
    fireEvent.press(await findByText('ایجاد نسخه پشتیبان'))

    expect(await findByText('نسخه پشتیبان آماده است')).toBeTruthy()
    fireEvent.press(await findByText('اشتراک‌گذاری (تلگرام و...)'))

    await waitFor(() =>
      expect(mockShareBackupFile).toHaveBeenCalledWith(
        '/mock/caches/azar-backup-20260810-120000.azarbackup',
        'azar-backup-20260810-120000.azarbackup'
      )
    )
  })

  it('shows an error and keeps the dialog open when backup creation fails', async () => {
    mockCreateBackupFile.mockRejectedValue(new Error('disk full'))
    const { findByLabelText, findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('تهیه نسخه پشتیبان'))
    fireEvent.changeText(await findByLabelText('رمز عبور'), 'a strong password')
    fireEvent.press(await findByText('ایجاد نسخه پشتیبان'))

    expect(await findByText('تهیه نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.')).toBeTruthy()
    expect(mockSaveBackupFileToDevice).not.toHaveBeenCalled()
    expect(mockShareBackupFile).not.toHaveBeenCalled()
  })

  it('shows the name as a label with an edit affordance, and saves once edited', async () => {
    mockGetDisplayName.mockReturnValue({
      displayName: 'محمد رضایی',
      isLoading: false,
      setDisplayName: mockSetDisplayName
    })

    const { findByText, findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('محمد رضایی')).toBeTruthy()

    fireEvent.press(await findByLabelText('ویرایش نام'))
    const nameField = await findByLabelText('نام')
    await fireEvent.changeText(nameField, 'رضا محمدی')
    await fireEvent(nameField, 'blur')

    expect(mockSetDisplayName).toHaveBeenCalledWith('رضا محمدی')
  })

  it('warns before importing, then picks a file, enters a password, and logs out on success', async () => {
    mockPickBackupFileBytes.mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockRestoreBackupFile.mockResolvedValue(undefined)
    const { findByLabelText, findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('بازیابی از نسخه پشتیبان'))
    expect(
      await findByText(
        'این کار تمام اطلاعات موجود در این دستگاه را با اطلاعات فایل انتخابی جایگزین می‌کند و غیرقابل بازگشت است. پیش از ادامه، در صورت نیاز از اطلاعات فعلی نسخه پشتیبان تهیه کنید.'
      )
    ).toBeTruthy()

    fireEvent.press(await findByText('انتخاب فایل'))
    await waitFor(() => expect(mockPickBackupFileBytes).toHaveBeenCalledTimes(1))

    fireEvent.changeText(await findByLabelText('رمز عبور'), 'a strong password')
    fireEvent.press(await findByText('بازیابی اطلاعات'))

    await waitFor(() =>
      expect(mockRestoreBackupFile).toHaveBeenCalledWith(
        {},
        'a strong password',
        expect.any(Uint8Array)
      )
    )
    expect(await findByText('بازیابی با موفقیت انجام شد')).toBeTruthy()

    fireEvent.press(await findByText('ورود مجدد'))
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
  })

  it('does not open the password prompt if the user cancels the file picker', async () => {
    mockPickBackupFileBytes.mockResolvedValue(null)
    const { findByLabelText, findByText, queryByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('بازیابی از نسخه پشتیبان'))
    fireEvent.press(await findByText('انتخاب فایل'))

    await waitFor(() => expect(mockPickBackupFileBytes).toHaveBeenCalledTimes(1))
    expect(queryByLabelText('رمز عبور')).toBeNull()
  })

  it('shows a specific message and does not log out when the import password is wrong', async () => {
    mockPickBackupFileBytes.mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockRestoreBackupFile.mockRejectedValue(new BackupAuthenticationError())
    const { findByLabelText, findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('بازیابی از نسخه پشتیبان'))
    fireEvent.press(await findByText('انتخاب فایل'))
    fireEvent.changeText(await findByLabelText('رمز عبور'), 'wrong password')
    fireEvent.press(await findByText('بازیابی اطلاعات'))

    expect(await findByText('رمز عبور اشتباه است یا فایل نسخه پشتیبان خراب شده است.')).toBeTruthy()
    expect(mockLogout).not.toHaveBeenCalled()
  })
})
