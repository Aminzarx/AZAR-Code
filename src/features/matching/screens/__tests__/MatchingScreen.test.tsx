import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { MatchingScreen } from '../MatchingScreen'
import { useProperties } from '@features/property/hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { useApplicantMatchesForProperty } from '../../hooks/useApplicantMatchesForProperty'
import { usePropertyMatchesForApplicant } from '../../hooks/usePropertyMatchesForApplicant'
import { useDealService } from '@features/deal/hooks/useDealService'
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
jest.mock('../../hooks/useApplicantMatchesForProperty')
jest.mock('../../hooks/usePropertyMatchesForApplicant')
jest.mock('@features/deal/hooks/useDealService')

const mockedUseProperties = useProperties as jest.MockedFunction<typeof useProperties>
const mockedUseApplicants = useApplicants as jest.MockedFunction<typeof useApplicants>
const mockedUseApplicantMatches = useApplicantMatchesForProperty as jest.MockedFunction<
  typeof useApplicantMatchesForProperty
>
const mockedUsePropertyMatches = usePropertyMatchesForApplicant as jest.MockedFunction<
  typeof usePropertyMatchesForApplicant
>
const mockedUseDealService = useDealService as jest.MockedFunction<typeof useDealService>
const mockCreateDeal = jest.fn()

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
    mockCreateDeal.mockReset()
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
    mockedUseApplicantMatches.mockReturnValue({
      matches: [{ applicant: APPLICANT, score: 25, matchedCriteria: ['city'] }],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUsePropertyMatches.mockReturnValue({
      matches: [{ property: PROPERTY, score: 25, matchedCriteria: ['city'] }],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseDealService.mockReturnValue({ createDeal: mockCreateDeal } as never)
  })

  it('shows the picker list, then a property selection reveals its applicant matches', async () => {
    const { findByText, queryByText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('آپارتمان دو خوابه'))

    expect(await findByText('علی رضایی')).toBeTruthy()
    expect(await findByText('1 از 6 معیار منطبق')).toBeTruthy()
    // The picker list step is gone once a record is selected.
    expect(queryByText('برای دیدن پیشنهادهای تطبیق، یک فایل را انتخاب کنید')).toBeNull()
  })

  it('navigates to ApplicantDetail when a match result is pressed', async () => {
    const { findByText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('آپارتمان دو خوابه'))
    fireEvent.press(await findByText('علی رضایی'))

    expect(mockNavigate).toHaveBeenCalledWith('ApplicantDetail', { applicantId: 'app-1' })
  })

  it('navigates to PropertyDetail when a match result is pressed after switching segments', async () => {
    const { findByText, findByLabelText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('متقاضیان'))
    fireEvent.press(await findByText('علی رضایی'))
    fireEvent.press(await findByText('آپارتمان دو خوابه'))

    expect(mockNavigate).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
  })

  it('creates a deal and navigates to DealDetail when "ایجاد معامله" is pressed', async () => {
    mockCreateDeal.mockResolvedValue({ id: 'deal-1' })

    const { findByText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('آپارتمان دو خوابه'))
    fireEvent.press(await findByText('ایجاد معامله'))

    await waitFor(() => expect(mockCreateDeal).toHaveBeenCalledWith('u1', 'prop-1', 'app-1'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('DealDetail', { dealId: 'deal-1' })
    )
  })

  it('lets the user change selection back to the picker list', async () => {
    const { findByText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('آپارتمان دو خوابه'))
    fireEvent.press(await findByText('تغییر انتخاب'))

    expect(await findByText('برای دیدن پیشنهادهای تطبیق، یک فایل را انتخاب کنید')).toBeTruthy()
  })

  it('shows the create-property empty state when there are no properties', async () => {
    mockedUseProperties.mockReturnValue({
      properties: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<MatchingScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('هنوز فایلی ثبت نشده')).toBeTruthy()
  })
})
