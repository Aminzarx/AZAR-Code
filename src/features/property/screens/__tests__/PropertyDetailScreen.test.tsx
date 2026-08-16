import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { PropertyDetailScreen } from '../PropertyDetailScreen'
import { usePropertyDetail } from '../../hooks/usePropertyDetail'
import { usePropertyService } from '../../hooks/usePropertyService'
import { usePropertyActivity } from '../../hooks/usePropertyActivity'
import type { Property } from '../../types'

jest.mock('../../hooks/usePropertyDetail')
jest.mock('../../hooks/usePropertyService')
jest.mock('../../hooks/usePropertyActivity')

const mockedUsePropertyDetail = usePropertyDetail as jest.MockedFunction<typeof usePropertyDetail>
const mockedUsePropertyService = usePropertyService as jest.MockedFunction<
  typeof usePropertyService
>
const mockedUsePropertyActivity = usePropertyActivity as jest.MockedFunction<
  typeof usePropertyActivity
>
const mockUpdateProperty = jest.fn()
const mockDeleteProperty = jest.fn()

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
  depositAmount: null,
  rentAmount: null,
  isConvertible: false,
  description: null,
  status: 'active',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z'
}

const mockGoBack = jest.fn()
const navigationProp = { goBack: mockGoBack, addListener: jest.fn(() => jest.fn()) } as never
const routeProp = {
  key: 'PropertyDetail',
  name: 'PropertyDetail' as const,
  params: { propertyId: 'prop-1' }
}

describe('PropertyDetailScreen', () => {
  beforeEach(() => {
    mockUpdateProperty.mockReset()
    mockDeleteProperty.mockReset()
    mockGoBack.mockReset()
    mockedUsePropertyService.mockReturnValue({
      updateProperty: mockUpdateProperty,
      deleteProperty: mockDeleteProperty
    } as never)
    mockedUsePropertyActivity.mockReturnValue({
      deals: [],
      reminders: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
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
    expect(await findByText('تهران • خیابان ولیعصر')).toBeTruthy()
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

    expect(await findByText('بارگذاری فایل با مشکل مواجه شد')).toBeTruthy()
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
    expect(await findByText('ذخیره')).toBeTruthy()

    await waitFor(() => fireEvent.changeText(getByLabelText('عنوان فایل'), 'عنوان جدید'))
    await waitFor(() => fireEvent.press(getByText('ذخیره')))

    await waitFor(() =>
      expect(mockUpdateProperty).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ title: 'عنوان جدید' }),
        'active'
      )
    )
  })

  it('archives the property without opening the edit form', async () => {
    const refetch = jest.fn()
    mockUpdateProperty.mockResolvedValue({ ...PROPERTY, status: 'archived' })
    mockedUsePropertyDetail.mockReturnValue({
      property: PROPERTY,
      isLoading: false,
      error: null,
      refetch
    })

    const { findByText } = await render(
      withTheme(<PropertyDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('بایگانی'))

    await waitFor(() =>
      expect(mockUpdateProperty).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ title: PROPERTY.title }),
        'archived'
      )
    )
    await waitFor(() => expect(refetch).toHaveBeenCalled())
  })

  it('shows "خروج از بایگانی" for an already-archived property', async () => {
    mockedUsePropertyDetail.mockReturnValue({
      property: { ...PROPERTY, status: 'archived' },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText, queryAllByText } = await render(
      withTheme(<PropertyDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('خروج از بایگانی')).toBeTruthy()
    // 'بایگانی' still legitimately appears once, in the archived-status
    // StatusBadge next to the title — this only checks the archive
    // *button* itself reads 'خروج از بایگانی', not 'بایگانی'.
    expect(queryAllByText('بایگانی')).toHaveLength(1)
  })

  it('deletes the property after confirmation and navigates back', async () => {
    mockDeleteProperty.mockResolvedValue(undefined)
    mockedUsePropertyDetail.mockReturnValue({
      property: PROPERTY,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    const { findByText } = await render(
      withTheme(<PropertyDetailScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByText('حذف فایل'))
    fireEvent.press(await findByText('حذف'))

    await waitFor(() => expect(mockDeleteProperty).toHaveBeenCalledWith('prop-1'))
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1))
  })
})
