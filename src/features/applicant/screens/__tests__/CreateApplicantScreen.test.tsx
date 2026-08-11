import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { CreateApplicantScreen } from '../CreateApplicantScreen'
import { useApplicantService } from '../../hooks/useApplicantService'
import { ApplicantValidationError } from '../../validation/ApplicantValidationError'
import { validateApplicantForm } from '../../validation/applicantValidation'
import type { ApplicantFormValues } from '../../types'

const EMPTY_VALUES: ApplicantFormValues = {
  fullName: '',
  phoneNumber: '',
  preferredTransactionType: '',
  preferredPropertyType: '',
  city: '',
  minBudget: '',
  maxBudget: '',
  minArea: '',
  maxArea: '',
  rooms: '',
  depositAmount: '',
  rentAmount: '',
  isConvertible: false,
  description: ''
}

const mockReplace = jest.fn()
const mockCreateApplicant = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useApplicantService')

const mockedUseApplicantService = useApplicantService as jest.MockedFunction<
  typeof useApplicantService
>

const navigationProp = { replace: mockReplace, addListener: jest.fn(() => jest.fn()) } as never
const routeProp = { key: 'CreateApplicant', name: 'CreateApplicant' as const, params: undefined }

describe('CreateApplicantScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockCreateApplicant.mockReset()
    mockedUseApplicantService.mockReturnValue({ createApplicant: mockCreateApplicant } as never)
  })

  it('shows the field errors the service reports when required fields are empty', async () => {
    const { errors } = validateApplicantForm(EMPTY_VALUES)
    mockCreateApplicant.mockRejectedValue(new ApplicantValidationError(errors ?? {}))

    const { getByText, findByText } = await render(
      withTheme(<CreateApplicantScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    expect(await findByText('نام الزامی است.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('creates the applicant and navigates to its detail screen on success', async () => {
    mockCreateApplicant.mockResolvedValue({ id: 'app-1' })

    const { getByLabelText, getByText } = await render(
      withTheme(<CreateApplicantScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('نام و نام خانوادگی'), 'علی رضایی'))
    await waitFor(() => fireEvent.changeText(getByLabelText('شماره تماس'), '09121234567'))
    await waitFor(() => fireEvent.changeText(getByLabelText('شهر'), 'تهران'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() =>
      expect(mockCreateApplicant).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          fullName: 'علی رضایی',
          phoneNumber: '09121234567',
          city: 'تهران'
        })
      )
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('ApplicantDetail', { applicantId: 'app-1' })
    )
  })
})
