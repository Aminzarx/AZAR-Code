import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PropertyListScreen } from '../PropertyListScreen'
import { useProperties } from '../../hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import type { Property } from '../../types'

const mockNavigate = jest.fn()
const mockGoBack = jest.fn()

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('../../hooks/useProperties')
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
  depositAmount: null,
  rentAmount: null,
  isConvertible: false,
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

const navigationProp = { navigate: mockNavigate, goBack: mockGoBack } as never
const routeProp = { key: 'PropertyList', name: 'PropertyList' as const, params: undefined }

describe('PropertyListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGoBack.mockReset()
    mockedUseProperties.mockReset()
    mockedUseApplicants.mockReturnValue({
      applicants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
  })

  it('shows a loading indicator while loading', async () => {
    mockedUseProperties.mockReturnValue({
      properties: null,
      isLoading: true,
      error: null,
      refetch: jest.fn()
    })

    const { queryByText } = await render(
      withTheme(<PropertyListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(queryByText('هنوز فایلی ثبت نشده')).toBeNull()
  })

  it('navigates back when the header back button is pressed', async () => {
    mockedUseProperties.mockReturnValue({
      properties: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<PropertyListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('بازگشت'))
    expect(mockGoBack).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there are no properties', async () => {
    mockedUseProperties.mockReturnValue({
      properties: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<PropertyListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('هنوز فایلی ثبت نشده')).toBeTruthy()
  })

  it('shows an error state with retry', async () => {
    const refetch = jest.fn()
    mockedUseProperties.mockReturnValue({
      properties: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<PropertyListScreen navigation={navigationProp} route={routeProp} />)
    )
    expect(await findByText('بارگذاری فایل‌ها با مشکل مواجه شد')).toBeTruthy()

    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('navigates to PropertyDetail when a property is pressed', async () => {
    mockedUseProperties.mockReturnValue({
      properties: [PROPERTY],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByLabelText } = await render(
      withTheme(<PropertyListScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('آپارتمان دو خوابه'))
    expect(mockNavigate).toHaveBeenCalledWith('PropertyDetail', { propertyId: 'prop-1' })
  })
})
