import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { FilesScreen } from '../FilesScreen'
import { useProperties } from '@features/property/hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'

jest.mock('@features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { sessionId: 's1', userId: 'u1', referralCode: 'ABCD1234', sessionToken: 't1' }
  })
}))

jest.mock('@features/property/hooks/useProperties')
jest.mock('@features/applicant/hooks/useApplicants')

const mockedUseProperties = useProperties as jest.MockedFunction<typeof useProperties>
const mockedUseApplicants = useApplicants as jest.MockedFunction<typeof useApplicants>

const navigationProp = {} as never
const routeProp = { key: 'Files', name: 'Files' as const, params: undefined }

describe('FilesScreen', () => {
  beforeEach(() => {
    mockedUseProperties.mockReturnValue({
      properties: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
    mockedUseApplicants.mockReturnValue({
      applicants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
  })

  it('shows the properties list by default', async () => {
    const { findByText } = await render(
      withTheme(<FilesScreen navigation={navigationProp} route={routeProp} />)
    )

    expect(await findByText('هنوز فایلی ثبت نشده')).toBeTruthy()
  })

  it('switches to the applicants list when that segment is pressed', async () => {
    const { findByLabelText, findByText } = await render(
      withTheme(<FilesScreen navigation={navigationProp} route={routeProp} />)
    )

    fireEvent.press(await findByLabelText('متقاضیان'))
    expect(await findByText('هنوز متقاضی‌ای ثبت نشده')).toBeTruthy()
  })
})

describe('FilesScreen — reload on return (v1.3.0)', () => {
  it('reloads the lists when the tab comes back into view', async () => {
    const refetchProperties = jest.fn()
    let onFocus: (() => void) | undefined
    mockedUseProperties.mockReturnValue({
      properties: [],
      isLoading: false,
      error: null,
      refetch: refetchProperties
    })
    const navigation = {
      addListener: (event: string, callback: () => void) => {
        if (event === 'focus') {
          onFocus = callback
        }
        return () => undefined
      }
    } as never

    await render(withTheme(<FilesScreen navigation={navigation} route={routeProp} />))
    expect(refetchProperties).not.toHaveBeenCalled()

    await act(async () => {
      onFocus?.()
    })
    expect(refetchProperties).toHaveBeenCalled()
  })
})
