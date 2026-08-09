import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { MatchingScreen } from '../MatchingScreen'
import { useProperties } from '@features/property/hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import type { Property } from '@features/property/types'
import type { Applicant } from '@features/applicant/types'

const mockNavigate = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('@features/property/hooks/useProperties')
jest.mock('@features/applicant/hooks/useApplicants')

const mockedUseProperties = useProperties as jest.MockedFunction<typeof useProperties>
const mockedUseApplicants = useApplicants as jest.MockedFunction<typeof useApplicants>

const PROPERTY: Property = {
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
}

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

const navigationProp = { navigate: mockNavigate } as never
const routeProp = { key: 'Matching', name: 'Matching' as const, params: undefined }

describe('MatchingScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockedUseProperties.mockReturnValue({
      properties: [PROPERTY],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseApplicants.mockReturnValue({
      applicants: [APPLICANT],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
  })

  it('navigates to PropertyDetail when a property is pressed', async () => {
    const { findByLabelText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('آپارتمان دو خوابه'))
    expect(mockNavigate).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
  })

  it('navigates to ApplicantDetail when an applicant is pressed after switching segments', async () => {
    const { findByLabelText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('متقاضیان'))
    fireEvent.press(await findByLabelText('علی رضایی'))
    expect(mockNavigate).toHaveBeenCalledWith('ApplicantDetail', { applicantId: 'app-1' })
  })
})
