import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { CreatePropertyScreen } from '../CreatePropertyScreen'
import { usePropertyService } from '../../hooks/usePropertyService'
import { PropertyValidationError } from '../../services/PropertyValidationError'
import { validatePropertyForm } from '../../services/propertyValidation'
import type { PropertyFormValues } from '../../types'

const EMPTY_VALUES: PropertyFormValues = {
  title: '',
  propertyType: '',
  transactionType: '',
  city: '',
  address: '',
  price: '',
  area: '',
  rooms: '',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  barterItems: [],
  barterOtherDescription: '',
  description: ''
}

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

describe('CreatePropertyScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    preventDefault.mockClear()
    beforeRemoveListener = null
    mockCreateProperty.mockReset()
    mockedUsePropertyService.mockReturnValue({ createProperty: mockCreateProperty } as never)
  })

  it('shows the field errors the service reports when required fields are empty', async () => {
    const { errors } = validatePropertyForm(EMPTY_VALUES)
    mockCreateProperty.mockRejectedValue(new PropertyValidationError(errors ?? {}))

    const { getByText, findByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    expect(await findByText('عنوان الزامی است.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('creates the property and navigates to its detail screen on success', async () => {
    mockCreateProperty.mockResolvedValue({ id: 'prop-1' })

    const { getByLabelText, getByText, queryByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان فایل'), 'آپارتمان جدید'))
    await waitFor(() => fireEvent.changeText(getByLabelText('شهر'), 'تهران'))
    await waitFor(() => fireEvent.changeText(getByLabelText('آدرس'), 'خیابان ولیعصر'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() =>
      expect(mockCreateProperty).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ title: 'آپارتمان جدید', city: 'تهران', address: 'خیابان ولیعصر' })
      )
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
    )

    // Regression: navigation.replace() fires `beforeRemove` synchronously,
    // within the same call, before setIsDirty(false) has re-rendered —
    // without markSaved()'s synchronous ref write, the guard treated its
    // own successful-save navigation as an unconfirmed exit and popped
    // the "unsaved changes" dialog right after a successful save.
    expect(preventDefault).not.toHaveBeenCalled()
    expect(queryByText('تغییرات ذخیره نشده')).toBeNull()
  })

  it('shows field errors returned by PropertyValidationError from the service', async () => {
    mockCreateProperty.mockRejectedValue(new PropertyValidationError({ city: 'شهر الزامی است.' }))

    const { getByLabelText, getByText, findByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان فایل'), 'آپارتمان جدید'))
    await waitFor(() => fireEvent.changeText(getByLabelText('آدرس'), 'خیابان ولیعصر'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    expect(await findByText('شهر الزامی است.')).toBeTruthy()
  })
})
