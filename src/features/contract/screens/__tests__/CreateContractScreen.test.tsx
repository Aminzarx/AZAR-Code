import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { CreateContractScreen } from '../CreateContractScreen'
import { useContractService } from '../../hooks/useContractService'
import { ContractValidationError } from '../../validation/ContractValidationError'

const mockReplace = jest.fn()
const mockCreateContract = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useContractService')
jest.mock('@features/photos/hooks/usePhotoRepository', () => ({ usePhotoRepository: () => null }))

const NEXT = 'ادامه: عکس‌ها'
const SAVE = 'ذخیرهٔ قرارداد'

const mockedUseContractService = useContractService as jest.MockedFunction<
  typeof useContractService
>

const navigationProp = { replace: mockReplace } as never
const routeProp = {
  key: 'CreateContract',
  name: 'CreateContract' as const,
  params: { propertyId: 'prop-1', applicantId: 'app-1', dealId: 'deal-1' }
}

describe('CreateContractScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockCreateContract.mockReset()
    mockedUseContractService.mockReturnValue({ createContract: mockCreateContract } as never)
  })

  it('does not leave the first step while the dates are not valid', async () => {
    const { getByText, findByText, queryByText } = await render(
      withTheme(<CreateContractScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByText(NEXT)))

    expect(
      await findByText('تاریخ شروع را به‌صورت ۱۴۰۵/۰۵/۱۲ (سال/ماه/روز شمسی) وارد کنید.')
    ).toBeTruthy()
    expect(queryByText('دوربین')).toBeNull()
    expect(mockCreateContract).not.toHaveBeenCalled()
  })

  it('Amin #5062: step 2 is the photos; the service errors bring the form back', async () => {
    mockCreateContract.mockRejectedValue(
      new ContractValidationError({ startDate: 'تاریخ شروع را وارد کنید.' })
    )

    const { getByLabelText, getByText, findByText } = await render(
      withTheme(<CreateContractScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ شروع'), '1405/06/10'))
    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ پایان'), '1406/06/10'))
    await waitFor(() => fireEvent.press(getByText(NEXT)))
    expect(getByText('دوربین')).toBeTruthy()
    expect(getByText('گالری')).toBeTruthy()
    await waitFor(() => fireEvent.press(getByText(SAVE)))

    expect(await findByText('تاریخ شروع را وارد کنید.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('creates the contract with the prefilled links and navigates to its detail screen', async () => {
    mockCreateContract.mockResolvedValue({ id: 'con-1' })

    const { getByLabelText, getByText } = await render(
      withTheme(<CreateContractScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ شروع'), '1405/06/10'))
    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ پایان'), '1406/06/10'))
    await waitFor(() => fireEvent.press(getByText(NEXT)))
    await waitFor(() => fireEvent.press(getByText(SAVE)))

    await waitFor(() =>
      expect(mockCreateContract).toHaveBeenCalledWith(
        'u1',
        { propertyId: 'prop-1', applicantId: 'app-1', dealId: 'deal-1' },
        expect.objectContaining({ startDate: '1405/06/10', endDate: '1406/06/10' })
      )
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('ContractDetail', { contractId: 'con-1' })
    )
  })
})
