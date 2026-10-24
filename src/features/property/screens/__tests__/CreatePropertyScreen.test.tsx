import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { CreatePropertyScreen } from '../CreatePropertyScreen'
import { usePropertyService } from '../../hooks/usePropertyService'
import { PropertyValidationError } from '../../services/PropertyValidationError'

const mockCreateProperty = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/usePropertyService')

const mockedUsePropertyService = usePropertyService as jest.MockedFunction<
  typeof usePropertyService
>

type BeforeRemoveListener = (event: {
  preventDefault: () => void
  data: { action: object }
}) => void
let beforeRemoveListener: BeforeRemoveListener | null = null
const mockAddListener = jest.fn((event: string, listener: BeforeRemoveListener) => {
  if (event === 'beforeRemove') {
    beforeRemoveListener = listener
  }
  return jest.fn()
})
const preventDefault = jest.fn()
// A real `navigation.replace()` call fires `beforeRemove` synchronously,
// within the same call — before React has re-rendered with whatever
// state update (e.g. setIsDirty(false)) preceded it. This mock replays
// that exact timing, which a plain `jest.fn()` replace() cannot.
const mockReplace = jest.fn(() => {
  beforeRemoveListener?.({ preventDefault, data: { action: {} } })
})
const navigationProp = {
  replace: mockReplace,
  addListener: mockAddListener,
  dispatch: jest.fn()
} as never
const routeProp = { key: 'CreateProperty', name: 'CreateProperty' as const, params: undefined }

const NEXT_1 = 'ادامه: مشخصات و قیمت'
const NEXT_2 = 'ادامه: مشخصات مالک'
const NEXT_3 = 'ادامه: عنوان و توضیحات'
const SAVE = 'ذخیرهٔ فایل'

describe('CreatePropertyScreen (v3.0.0 three steps)', () => {
  const mockListProperties = jest.fn()

  beforeEach(() => {
    mockReplace.mockClear()
    preventDefault.mockClear()
    beforeRemoveListener = null
    mockCreateProperty.mockReset()
    mockListProperties.mockReset()
    mockListProperties.mockResolvedValue([])
    mockedUsePropertyService.mockReturnValue({
      createProperty: mockCreateProperty,
      listProperties: mockListProperties
    } as never)
  })

  it('does not leave step 1 until city and address are filled', async () => {
    const { getByText, findAllByText, queryByLabelText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByText(NEXT_1)))

    expect(await findAllByText('این مورد لازم است.')).toHaveLength(2)
    expect(queryByLabelText('عنوان فایل')).toBeNull()
    expect(mockCreateProperty).not.toHaveBeenCalled()
  })

  it('walks the three steps, suggests a title, saves and opens the new file', async () => {
    mockCreateProperty.mockResolvedValue({ id: 'prop-1' })

    const { getByLabelText, getByText, queryByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByLabelText('آپارتمان')))
    await waitFor(() => fireEvent.changeText(getByLabelText('شهر'), 'تهران'))
    await waitFor(() => fireEvent.changeText(getByLabelText('آدرس'), 'خیابان ولیعصر'))
    await waitFor(() => fireEvent.press(getByText(NEXT_1)))
    await waitFor(() => fireEvent.press(getByLabelText('یکی بیشتر تعداد اتاق')))
    await waitFor(() => fireEvent.press(getByLabelText('یکی بیشتر تعداد اتاق')))
    await waitFor(() => fireEvent.press(getByText(NEXT_2)))
    await waitFor(() => fireEvent.press(getByText(NEXT_3)))

    await waitFor(() =>
      expect(getByLabelText('عنوان فایل').props.value).toBe('آپارتمان ۲ خوابه، تهران')
    )
    await waitFor(() => fireEvent.press(getByText(SAVE)))

    await waitFor(() =>
      expect(mockCreateProperty).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          title: 'آپارتمان ۲ خوابه، تهران',
          propertyType: 'آپارتمان',
          city: 'تهران',
          address: 'خیابان ولیعصر',
          rooms: '2'
        })
      )
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
    )
    // Regression: navigation.replace() fires `beforeRemove` synchronously,
    // before setIsDirty(false) has re-rendered — markSaved()'s synchronous
    // ref write keeps the guard from treating its own save as an exit.
    expect(preventDefault).not.toHaveBeenCalled()
    expect(queryByText('تغییرات ذخیره نشده')).toBeNull()
  })

  it('goes back to the step that holds a field the service rejected', async () => {
    mockCreateProperty.mockRejectedValue(new PropertyValidationError({ city: 'شهر الزامی است.' }))

    const { getByLabelText, getByText, findByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('شهر'), 'تهران'))
    await waitFor(() => fireEvent.changeText(getByLabelText('آدرس'), 'خیابان ولیعصر'))
    await waitFor(() => fireEvent.press(getByText(NEXT_1)))
    await waitFor(() => fireEvent.press(getByText(NEXT_2)))
    await waitFor(() => fireEvent.press(getByText(NEXT_3)))
    await waitFor(() => fireEvent.press(getByText(SAVE)))

    expect(await findByText('شهر الزامی است.')).toBeTruthy()
    expect(getByText(NEXT_1)).toBeTruthy()
  })

  it('Amin #5066: owner step is optional, but a typed owner needs a name and a valid mobile', async () => {
    mockCreateProperty.mockResolvedValue({ id: 'prop-2' })
    const { getByLabelText, getByText, findByText, queryByLabelText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('شهر'), 'تهران'))
    await waitFor(() => fireEvent.changeText(getByLabelText('آدرس'), 'خیابان ولیعصر'))
    await waitFor(() => fireEvent.press(getByText(NEXT_1)))
    await waitFor(() => fireEvent.press(getByText(NEXT_2)))
    await waitFor(() => fireEvent.changeText(getByLabelText('نام مالک'), 'حسین محمدی'))
    await waitFor(() => fireEvent.changeText(getByLabelText('شماره موبایل مالک'), '0912'))
    await waitFor(() => fireEvent.press(getByText(NEXT_3)))

    expect(await findByText('شماره موبایل معتبر وارد کنید (مثلاً 09121234567).')).toBeTruthy()
    expect(queryByLabelText('عنوان فایل')).toBeNull()

    await waitFor(() =>
      fireEvent.changeText(getByLabelText('شماره موبایل مالک'), '۰۹۱۲۱۲۳۴۵۶۷')
    )
    await waitFor(() => fireEvent.press(getByText(NEXT_3)))
    await waitFor(() => fireEvent.press(getByText(SAVE)))

    await waitFor(() =>
      expect(mockCreateProperty).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ ownerName: 'حسین محمدی', ownerPhone: '۰۹۱۲۱۲۳۴۵۶۷' })
      )
    )
  })

  it('starts the city as the city of the last file', async () => {
    mockListProperties.mockResolvedValue([{ city: 'شیراز' }])

    const { getByLabelText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => expect(getByLabelText('شهر').props.value).toBe('شیراز'))
  })
})
