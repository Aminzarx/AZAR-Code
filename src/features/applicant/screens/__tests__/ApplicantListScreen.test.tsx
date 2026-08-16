import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ApplicantListScreen } from '../ApplicantListScreen'
import { useApplicants } from '../../hooks/useApplicants'
import type { Applicant } from '../../types'

const mockNavigate = jest.fn()
const mockGoBack = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useApplicants')

const mockedUseApplicants = useApplicants as jest.MockedFunction<typeof useApplicants>

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
  depositAmount: null,
  rentAmount: null,
  isConvertible: false,
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

const navigationProp = { navigate: mockNavigate, goBack: mockGoBack } as never
const routeProp = { key: 'ApplicantList', name: 'ApplicantList' as const, params: undefined }

describe('ApplicantListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGoBack.mockReset()
    mockedUseApplicants.mockReset()
  })

  it('navigates back when the header back button is pressed', async () => {
    mockedUseApplicants.mockReturnValue({
      applicants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<ApplicantListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('بازگشت'))
    expect(mockGoBack).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there are no applicants', async () => {
    mockedUseApplicants.mockReturnValue({
      applicants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<ApplicantListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('هنوز متقاضی‌ای ثبت نشده')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUseApplicants.mockReturnValue({
      applicants: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<ApplicantListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('بارگذاری متقاضیان با مشکل مواجه شد')).toBeTruthy()

    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates to ApplicantDetail when an applicant is pressed', async () => {
    mockedUseApplicants.mockReturnValue({
      applicants: [APPLICANT],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<ApplicantListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('علی رضایی'))
    expect(mockNavigate).toHaveBeenCalledWith('ApplicantDetail', { applicantId: 'app-1' })
  })
})
