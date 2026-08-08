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

  it('shows the field errors the service reports when required fields are invalid', async () => {
    mockCreateContract.mockRejectedValue(
      new ContractValidationError({ startDate: 'تاریخ شروع را وارد کنید.' })
    )

    const { getByText, findByText } = await render(
      withTheme(<CreateContractScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.press(getByText('ثبت قرارداد')))

    expect(await findByText('تاریخ شروع را وارد کنید.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('creates the contract with the prefilled links and navigates to its detail screen', async () => {
    mockCreateContract.mockResolvedValue({ id: 'con-1' })

    const { getByLabelText, getByText } = await render(
      withTheme(<CreateContractScreen navigation={navigationProp} route={routeProp} />)
    )

    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ شروع'), '2026-09-01'))
    await waitFor(() => fireEvent.changeText(getByLabelText('تاریخ پایان'), '2027-09-01'))
    await waitFor(() => fireEvent.press(getByText('ثبت قرارداد')))

    await waitFor(() =>
      expect(mockCreateContract).toHaveBeenCalledWith(
        'u1',
        { propertyId: 'prop-1', applicantId: 'app-1', dealId: 'deal-1' },
        expect.objectContaining({ startDate: '2026-09-01', endDate: '2027-09-01' })
      )
    )
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('ContractDetail', { contractId: 'con-1' })
    )
  })
})
