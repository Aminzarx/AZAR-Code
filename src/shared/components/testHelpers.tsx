import React from 'react'
import { ThemeProvider } from '@shared/theme'

export function withTheme(children: React.ReactNode, isRTL = true): React.JSX.Element {
  return <ThemeProvider isRTL={isRTL}>{children}</ThemeProvider>
}
