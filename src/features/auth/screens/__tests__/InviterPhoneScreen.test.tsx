import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { InviterPhoneScreen } from '../InviterPhoneScreen'
import { useAuth } from '@features/auth/AuthProvider'
import { ValidationFailureError } from '@core/auth/errors'

jest.mock('@features/auth/AuthProvider')

const mockRegister = jest.fn()
const route = {
  key: 'InviterPhone',
  name: 'InviterPhone' as const,
  params: { phoneNumber: '+989121234567', displayName: 'علی رضایی' }
}

describe('InviterPhoneScreen (Amin #5344)', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    ;(useAuth as jest.Mock).mockReturnValue({ register: mockRegister })
  })

  it("signs up with the inviter's mobile, Persian digits too", async () => {
    mockRegister.mockResolvedValue(undefined)
    const { getByLabelText, getByText } = await render(withTheme(<InviterPhoneScreen navigation={{} as never} route={route} />))
    await fireEvent.changeText(getByLabelText('شمارهٔ موبایل دعوت‌کننده'), '۰۹۱۲۷۶۵۴۳۲۱')
    await fireEvent.press(getByText('ورود به برنامه'))
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('+989121234567', '09127654321', {
        displayName: 'علی رضایی',
        agencyName: undefined
      })
    )
  })

  it('says so when the number is not a member, and refuses your own number', async () => {
    mockRegister.mockRejectedValue(new ValidationFailureError('x', 'invalid_inviter_phone'))
    const { getByLabelText, getByText, findByText } = await render(
      withTheme(<InviterPhoneScreen navigation={{} as never} route={route} />)
    )
    await fireEvent.changeText(getByLabelText('شمارهٔ موبایل دعوت‌کننده'), '09127654321')
    await fireEvent.press(getByText('ورود به برنامه'))
    expect(await findByText('این شماره در ایوان پیدا نشد؛ شمارهٔ همکاری را بنویسید که خودش ایوان دارد.')).toBeTruthy()

    mockRegister.mockClear()
    await fireEvent.changeText(getByLabelText('شمارهٔ موبایل دعوت‌کننده'), '09121234567')
    await fireEvent.press(getByText('ورود به برنامه'))
    expect(await findByText('شمارهٔ خودتان را نمی‌توانید وارد کنید.')).toBeTruthy()
    expect(mockRegister).not.toHaveBeenCalled()
  })
})
