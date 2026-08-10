import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ApplicantDetailScreen } from '../ApplicantDetailScreen'
import { useApplicantDetail } from '../../hooks/useApplicantDetail'
import { useApplicantService } from '../../hooks/useApplicantService'
import type { Applicant } from '../../types'

jest.mock('../../hooks/useApplicantDetail')
jest.mock('../../hooks/useApplicantService')

const mockedUseApplicantDetail = useApplicantDetail as jest.MockedFunction<
  typeof useApplicantDetail
>
const mockedUseApplicantService = useApplicantService as jest.MockedFunction<
  typeof useApplicantService
>
const mockUpdateApplicant = jest.fn()
const mockDeleteApplicant = jest.fn()
const mockGoBack = jest.fn()

const APPLICANT: Applicant = {
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

const navigationProp = { goBack: mockGoBack } as never
const routeProp = {
  key: 'ApplicantDetail',
  name: 'ApplicantDetail' as const,
  params: { applicantId: 'app-1' }
}

describe('ApplicantDetailScreen', () => {
  beforeEach(() => {
    mockUpdateApplicant.mockReset()
    mockDeleteApplicant.mockReset()
    mockGoBack.mockReset()
    mockedUseApplicantService.mockReturnValue({
      updateApplicant: mockUpdateApplicant,
      deleteApplicant: mockDeleteApplicant
    } as never)
  })

  it('shows the applicant details', async () => {
    mockedUseApplicantDetail.mockReturnValue({
      applicant: APPLICANT,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ApplicantDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('علی رضایی')).toBeTruthy()
    expect(await findByText('09121234567')).toBeTruthy()
  })

  it('shows an error state with retry when loading fails', async () => {
    const refetch = jest.fn()
    mockedUseApplicantDetail.mockReturnValue({
      applicant: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<ApplicantDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بارگذاری متقاضی با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('switches to edit mode and submits an update', async () => {
    mockUpdateApplicant.mockResolvedValue({ ...APPLICANT, fullName: 'نام جدید' })
    mockedUseApplicantDetail.mockReturnValue({
      applicant: APPLICANT,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, getByText, getByLabelText } = await render(
      withTheme(<ApplicantDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('ویرایش'))
    expect(await findByText('ذخیره تغییرات')).toBeTruthy()

    await waitFor(() => fireEvent.changeText(getByLabelText('نام و نام خانوادگی'), 'نام جدید'))
    await waitFor(() => fireEvent.press(getByText('ذخیره تغییرات')))

    await waitFor(() =>
      expect(mockUpdateApplicant).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ fullName: 'نام جدید' }),
        'active'
      )
    )
  })

  it('deletes the applicant after confirmation and navigates back', async () => {
    mockDeleteApplicant.mockResolvedValue(undefined)
    mockedUseApplicantDetail.mockReturnValue({
      applicant: APPLICANT,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ApplicantDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('حذف متقاضی'))
    fireEvent.press(await findByText('حذف'))

    await waitFor(() => expect(mockDeleteApplicant).toHaveBeenCalledWith('app-1'))
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1))
  })
})
