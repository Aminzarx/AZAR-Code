import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { ConnectionsScreen } from '../ConnectionsScreen'

const mockTurn = jest.fn()
let mockOn: boolean | null = false
jest.mock('@features/property/services/divarSwitch', () => ({
  DIVAR_CONSENT_TEXT: 'متن پذیرش',
  useDivarImportSwitch: () => ({ on: mockOn, turn: mockTurn })
}))

const navigation = { goBack: jest.fn() } as never
const route = { key: 'Connections', name: 'Connections' as const, params: undefined }

describe('ConnectionsScreen (Amin #5795)', () => {
  beforeEach(() => {
    mockTurn.mockReset()
    mockTurn.mockResolvedValue(undefined)
    mockOn = false
  })

  it('turning the Divar import on asks for agreement first, then records it', async () => {
    const { getByLabelText, getByText, queryByText } = await render(
      withTheme(<ConnectionsScreen navigation={navigation} route={route} />)
    )
    expect(queryByText('متن پذیرش')).toBeNull()
    await fireEvent(getByLabelText('ورود آگهی از دیوار'), 'valueChange', true)
    expect(getByText('متن پذیرش')).toBeTruthy()
    expect(mockTurn).not.toHaveBeenCalled()
    await fireEvent.press(getByText('می‌پذیرم'))
    await waitFor(() => expect(mockTurn).toHaveBeenCalledWith(true))
  })

  it('turning it off needs no agreement', async () => {
    mockOn = true
    const { getByLabelText } = await render(withTheme(<ConnectionsScreen navigation={navigation} route={route} />))
    await fireEvent(getByLabelText('ورود آگهی از دیوار'), 'valueChange', false)
    await waitFor(() => expect(mockTurn).toHaveBeenCalledWith(false))
  })
})
