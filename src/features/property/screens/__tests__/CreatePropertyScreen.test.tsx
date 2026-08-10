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
  description: ''
}

const mockReplace = jest.fn()
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

const navigationProp = { replace: mockReplace } as never
const routeProp = { key: 'CreateProperty', name: 'CreateProperty' as const, params: undefined }

describe('CreatePropertyScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset()
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

    const { getByLabelText, getByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان پرونده'), 'آپارتمان جدید'))
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
  })

  it('shows field errors returned by PropertyValidationError from the service', async () => {
    mockCreateProperty.mockRejectedValue(new PropertyValidationError({ city: 'شهر الزامی است.' }))

    const { getByLabelText, getByText, findByText } = await render(
      withTheme(<CreatePropertyScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان پرونده'), 'آپارتمان جدید'))
    await waitFor(() => fireEvent.changeText(getByLabelText('آدرس'), 'خیابان ولیعصر'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    expect(await findByText('شهر الزامی است.')).toBeTruthy()
  })
})
