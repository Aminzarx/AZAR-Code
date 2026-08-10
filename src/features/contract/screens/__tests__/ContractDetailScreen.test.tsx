import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ContractDetailScreen } from '../ContractDetailScreen'
import { useContractDetail } from '../../hooks/useContractDetail'
import { useContractService } from '../../hooks/useContractService'
import type { ContractWithDetails } from '../../types'

jest.mock('../../hooks/useContractDetail')
jest.mock('../../hooks/useContractService')

const mockedUseContractDetail = useContractDetail as jest.MockedFunction<typeof useContractDetail>
const mockedUseContractService = useContractService as jest.MockedFunction<
  typeof useContractService
>
const mockUpdateContract = jest.fn()
const mockDeleteContract = jest.fn()
const mockGoBack = jest.fn()

const CONTRACT: ContractWithDetails = {
  id: 'con-1',
  userId: 'u1',
  propertyId: 'prop-1',
  applicantId: 'app-1',
  dealId: null,
  type: 'اجاره',
  status: 'active',
  amount: 500000000,
  startDate: '2026-09-01',
  endDate: '2027-09-01',
  notes: null,
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
  property: {
    id: 'prop-1',
    ownerId: 'u1',
    title: 'آپارتمان دو خوابه',
    propertyType: null,
    transactionType: null,
    city: 'تهران',
    address: 'خیابان ولیعصر',
    price: null,
    area: null,
    rooms: null,
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z'
  },
  applicant: {
    id: 'app-1',
    userId: 'u1',
    fullName: 'علی رضایی',
    phoneNumber: '09121234567',
    email: null,
    applicantType: null,
    preferredTransactionType: null,
    preferredPropertyType: null,
    city: 'تهران',
    minBudget: null,
    maxBudget: null,
    minArea: null,
    maxArea: null,
    rooms: null,
    description: null,
    status: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z'
  }
}

const navigationProp = { goBack: mockGoBack } as never
const routeProp = {
  key: 'ContractDetail',
  name: 'ContractDetail' as const,
  params: { contractId: 'con-1' }
}

describe('ContractDetailScreen', () => {
  beforeEach(() => {
    mockUpdateContract.mockReset()
    mockDeleteContract.mockReset()
    mockGoBack.mockReset()
    mockedUseContractService.mockReturnValue({
      updateContract: mockUpdateContract,
      deleteContract: mockDeleteContract
    } as never)
  })

  it('shows the property and applicant details', async () => {
    mockedUseContractDetail.mockReturnValue({
      contract: CONTRACT,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ContractDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(await findByText('علی رضایی')).toBeTruthy()
  })

  it('shows an error state with retry when loading fails', async () => {
    const refetch = jest.fn()
    mockedUseContractDetail.mockReturnValue({
      contract: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<ContractDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بارگذاری قرارداد با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('changes status when a status chip is pressed', async () => {
    mockUpdateContract.mockResolvedValue({ ...CONTRACT, status: 'completed' })
    const refetch = jest.fn()
    mockedUseContractDetail.mockReturnValue({
      contract: CONTRACT,
      isLoading: false,
      error: null,
      refetch
    })

    const { findByLabelText } = await render(
      withTheme(<ContractDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    const chip = await findByLabelText('تکمیل‌شده')
    await waitFor(() => fireEvent.press(chip))

    await waitFor(() =>
      expect(mockUpdateContract).toHaveBeenCalledWith(
        'con-1',
        expect.objectContaining({ type: 'اجاره' }),
        'completed'
      )
    )
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })

  it('switches to edit mode and submits an update', async () => {
    mockUpdateContract.mockResolvedValue({ ...CONTRACT, type: 'فروش' })
    mockedUseContractDetail.mockReturnValue({
      contract: CONTRACT,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, getByText, getByLabelText } = await render(
      withTheme(<ContractDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('ویرایش'))
    expect(await findByText('ذخیره تغییرات')).toBeTruthy()

    await waitFor(() => fireEvent.changeText(getByLabelText('نوع قرارداد'), 'فروش'))
    await waitFor(() => fireEvent.press(getByText('ذخیره تغییرات')))

    await waitFor(() =>
      expect(mockUpdateContract).toHaveBeenCalledWith(
        'con-1',
        expect.objectContaining({ type: 'فروش' }),
        'active'
      )
    )
  })

  it('deletes the contract after confirmation and navigates back', async () => {
    mockDeleteContract.mockResolvedValue(undefined)
    mockedUseContractDetail.mockReturnValue({
      contract: CONTRACT,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ContractDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('حذف قرارداد'))
    fireEvent.press(await findByText('حذف'))

    await waitFor(() => expect(mockDeleteContract).toHaveBeenCalledWith('con-1'))
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1))
  })
})
