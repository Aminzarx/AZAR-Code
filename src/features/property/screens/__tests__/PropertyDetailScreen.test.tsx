import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PropertyDetailScreen } from '../PropertyDetailScreen'
import { usePropertyDetail } from '../../hooks/usePropertyDetail'
import { usePropertyService } from '../../hooks/usePropertyService'
import type { Property } from '../../types'

jest.mock('../../hooks/usePropertyDetail')
jest.mock('../../hooks/usePropertyService')

const mockedUsePropertyDetail = usePropertyDetail as jest.MockedFunction<typeof usePropertyDetail>
const mockedUsePropertyService = usePropertyService as jest.MockedFunction<
  typeof usePropertyService
>
const mockUpdateProperty = jest.fn()

const PROPERTY: Property = {
  id: 'prop-1',
  ownerId: 'u1',
  title: 'آپارتمان دو خوابه',
  propertyType: 'آپارتمان',
  transactionType: 'فروش',
  city: 'تهران',
  address: 'خیابان ولیعصر',
  price: 5000000000,
  area: 120,
  rooms: 2,
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

const navigationProp = {} as never
const routeProp = {
  key: 'PropertyDetail',
  name: 'PropertyDetail' as const,
  params: { propertyId: 'prop-1' }
}

describe('PropertyDetailScreen', () => {
  beforeEach(() => {
    mockUpdateProperty.mockReset()
    mockedUsePropertyService.mockReturnValue({ updateProperty: mockUpdateProperty } as never)
  })

  it('shows the property details', async () => {
    mockedUsePropertyDetail.mockReturnValue({
      property: PROPERTY,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<PropertyDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('آپارتمان دو خوابه')).toBeTruthy()
    expect(await findByText('تهران — خیابان ولیعصر')).toBeTruthy()
  })

  it('shows an error state with retry when loading fails', async () => {
    const refetch = jest.fn()
    mockedUsePropertyDetail.mockReturnValue({
      property: null,
      isLoading: false,
      error: new Error('اتصال برقرار نشد'),
      refetch
    })

    const { findByText } = await render(
      withTheme(<PropertyDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('بارگذاری پرونده با مشکل مواجه شد')).toBeTruthy()
    fireEvent.press(await findByText('تلاش مجدد'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('switches to edit mode and submits an update', async () => {
    mockUpdateProperty.mockResolvedValue({ ...PROPERTY, title: 'عنوان جدید' })
    mockedUsePropertyDetail.mockReturnValue({
      property: PROPERTY,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, getByText, getByLabelText } = await render(
      withTheme(<PropertyDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('ویرایش'))
    expect(await findByText('ذخیره تغییرات')).toBeTruthy()

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان پرونده'), 'عنوان جدید'))
    await waitFor(() => fireEvent.press(getByText('ذخیره تغییرات')))

    await waitFor(() =>
      expect(mockUpdateProperty).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ title: 'عنوان جدید' }),
        'active'
      )
    )
  })
})
