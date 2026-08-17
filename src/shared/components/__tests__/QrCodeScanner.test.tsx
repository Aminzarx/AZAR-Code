import React from 'react'
import { PermissionsAndroid } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '../testHelpers'
import { QrCodeScanner } from '../QrCodeScanner'

describe('QrCodeScanner', () => {
  it('renders the camera once permission is granted, and calls onClose', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED)
    const onClose = jest.fn()
    const { getByTestId, getByLabelText } = await render(
      withTheme(<QrCodeScanner visible title="اسکن بارکد" onScan={jest.fn()} onClose={onClose} />)
    )

    await waitFor(() => expect(getByTestId('camera-kit-mock')).toBeTruthy())
    fireEvent.press(getByLabelText('بستن'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows an error state when permission is denied', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED)
    const { findByText } = await render(
      withTheme(<QrCodeScanner visible title="اسکن بارکد" onScan={jest.fn()} onClose={jest.fn()} />)
    )

    expect(await findByText('دسترسی دوربین داده نشد')).toBeTruthy()
  })
})
