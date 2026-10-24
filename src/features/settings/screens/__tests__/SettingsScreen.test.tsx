import React from 'react'
import { Clipboard, Linking } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { SettingsScreen } from '../SettingsScreen'

const mockLogout = jest.fn()
const mockSendOtp = jest.fn()
const mockVerifyOtp = jest.fn()
const mockDeleteAccount = jest.fn()
const mockFindById = jest.fn()
const mockSessionFindById = jest.fn()
const mockUseProfile = jest.fn()
const mockNavigate = jest.fn()
const mockGetSupportContacts = jest.fn()
const mockSyncNow = jest.fn()
let mockSync = { state: 'idle', pending: 0, usage: null as null | { bytes: number; quotaBytes: number; tokens: number } }

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'AZARSEED', sessionToken: 't1' },
    logout: mockLogout,
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
    deleteAccount: mockDeleteAccount,
    getSupportContacts: mockGetSupportContacts,
    sync: mockSync,
    syncNow: mockSyncNow
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

jest.mock('../../hooks/useProfile', () => ({
  useProfile: () => mockUseProfile()
}))

jest.mock('@infrastructure/images/profilePhoto', () => ({
  photoUri: (path: string | null) => (path ? `file://${path}` : null)
}))

function profileWith(over: { displayName?: string | null } = {}) {
  return {
    profile: {
      displayName: over.displayName ?? null,
      agencyName: null,
      photoPath: null,
      phoneNumber: '+989121234567'
    },
    storage: { bytes: 97600, tokens: 12.4, allowance: 6350, share: 12.4 / 6350 },
    reload: jest.fn()
  }
}

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'Settings', name: 'Settings' as const, params: undefined }

// v1.4.0: «خروج» and «حذف حساب» sit on the page itself now (no ⋮ menu)
async function openMenu(_findByLabelText: (label: string) => Promise<any>): Promise<void> {}

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
    mockUseProfile.mockReset()
    mockUseProfile.mockReturnValue(profileWith())
    mockNavigate.mockReset()
    mockGetSupportContacts.mockReset()
    mockSyncNow.mockReset()
    mockSyncNow.mockResolvedValue(0)
    mockSync = { state: 'idle', pending: 0, usage: null }
    mockGetSupportContacts.mockResolvedValue({
      prefix: 'پشتیبانی اپلیکیشن ایوان',
      whatsapp: '989120000000',
      telegram: null,
      rubika: null
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

    expect(await findByText('۰۹۱۲۱۲۳۴۵۶۷')).toBeTruthy()
  })

  // v1.4.0 (Amin #4324)
  it('says whose app this is and opens the company site', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { findByText, findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('ایوان، برنامه‌ای از خیام صنعت شریف')).toBeTruthy()
    fireEvent.press(await findByLabelText('ایوان، برنامه‌ای از خیام صنعت شریف؛ ورود به وبسایت kssx.ir'))
    expect(openURL).toHaveBeenCalledWith('https://kssx.ir')
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
      await findByText('پرونده‌هایتان روی حساب شما می‌ماند و از این گوشی پاک می‌شود؛ با ورود دوباره، همه برمی‌گردد.')
    ).toBeTruthy()

    fireEvent.press(await findByText('انصراف'))
    await waitFor(() =>
      expect(queryByText('پرونده‌هایتان روی حساب شما می‌ماند و از این گوشی پاک می‌شود؛ با ورود دوباره، همه برمی‌گردد.')).toBeNull()
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

  // v1.5.0 (Amin #4632): «ویرایش» opens the profile page
  it('shows the name and opens the profile page from «ویرایش»', async () => {
    mockUseProfile.mockReturnValue(profileWith({ displayName: 'محمد رضایی' }))

    const { findByText, findByLabelText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('محمد رضایی')).toBeTruthy()
    fireEvent.press(await findByLabelText('ویرایش پروفایل'))
    expect(mockNavigate).toHaveBeenCalledWith('Profile')
  })

  // v1.5.0 (Amin #4632 «چرا بخش توکن‌ها نیست؟»)
  it('shows the storage tokens used out of 6,350', async () => {
    const { findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('۱۲٫۴ از ۶٬۳۵۰ توکن مصرف شده')).toBeTruthy()
  })

  // v1.5.0 (Amin #4632): support in the messenger the user picks, labelled for IRIS
  // AZAR-SYNC-001 (Amin #4797): the account's files live on the server; no backup files any more
  it('shows the server\'s token count and that every file is saved, with no backup row', async () => {
    mockSync = { state: 'idle', pending: 0, usage: { bytes: 1_000_000, quotaBytes: 50_000_000, tokens: 127 } }
    const { findByText, queryByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('۱۲۷ از ۶٬۳۵۰ توکن مصرف شده')).toBeTruthy()
    expect(await findByText('همهٔ پرونده‌ها روی حساب شما ذخیره شده است')).toBeTruthy()
    expect(queryByText('نسخه پشتیبان')).toBeNull()
  })

  it('warns before signing out when changes have not reached the server', async () => {
    mockSync = { state: 'offline', pending: 3, usage: null }
    mockSyncNow.mockResolvedValue(3)
    const { findByLabelText, findByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('۳ تغییر منتظر اینترنت است')).toBeTruthy()
    fireEvent.press(await findByLabelText('خروج از حساب'))
    expect(await findByText(/۳ تغییر هنوز به سرور نرسیده/)).toBeTruthy()
    fireEvent.press(await findByText('خروج و پاک کردن'))
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
  })

  it('opens support in WhatsApp with the support line first; unset messengers wait', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { findByLabelText, findAllByText } = await render(
      withTheme(<SettingsScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('راهنما و پشتیبانی'))
    await waitFor(() => expect(mockGetSupportContacts).toHaveBeenCalled())
    expect((await findAllByText('به‌زودی')).length).toBe(2)
    fireEvent.press(await findByLabelText('واتس‌اپ'))
    const url = openURL.mock.calls[openURL.mock.calls.length - 1]?.[0] as string
    expect(url.startsWith('https://wa.me/989120000000?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1] ?? '').split(String.fromCharCode(10))[0]).toBe('پشتیبانی اپلیکیشن ایوان')
  })

})
