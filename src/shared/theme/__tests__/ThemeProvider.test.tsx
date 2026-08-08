import React from 'react'
import { renderHook } from '@testing-library/react-native'
import { ThemeProvider, useTheme } from '../ThemeProvider'
import { lightColors, typographyLtr, typographyRtl } from '../tokens'

function wrapper(isRTL?: boolean) {
  return ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider isRTL={isRTL}>{children}</ThemeProvider>
  )
}

describe('ThemeProvider / useTheme', () => {
  it('throws when used outside a ThemeProvider', async () => {
    const { result } = await renderHook(() => {
      try {
        return useTheme()
      } catch (error) {
        return error
      }
    })
    expect(result.current).toBeInstanceOf(Error)
  })

  it('defaults to RTL (AZAR is Persian-first)', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapper() })
    expect(result.current.isRTL).toBe(true)
  })

  it('exposes the light color palette from design-tokens.json', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapper() })
    expect(result.current.colors).toEqual(lightColors)
  })

  it('resolves typography with RTL alignment/direction and RTL line-heights when isRTL is true', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapper(true) })
    const bodyMd = result.current.typography('bodyMd')
    expect(bodyMd.textAlign).toBe('right')
    expect(bodyMd.writingDirection).toBe('rtl')
    expect(bodyMd.lineHeight).toBe(typographyRtl.bodyMd.lineHeight)
  })

  it('resolves typography with LTR alignment/direction and LTR line-heights when isRTL is false', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapper(false) })
    const bodyMd = result.current.typography('bodyMd')
    expect(bodyMd.textAlign).toBe('left')
    expect(bodyMd.writingDirection).toBe('ltr')
    expect(bodyMd.lineHeight).toBe(typographyLtr.bodyMd.lineHeight)
  })

  it('exposes the 48dp minimum touch target from design-tokens.json', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapper() })
    expect(result.current.touchTargetMinimum).toBe(48)
  })
})
