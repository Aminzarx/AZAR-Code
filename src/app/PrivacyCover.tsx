import React, { useEffect, useState } from 'react'
import { AppState, StyleSheet } from 'react-native'
import { LogoPlaceholder } from '@shared/components'
import { useTheme } from '@shared/theme'

/**
 * Amin #5199: when the app goes to the background or the app switcher, the screen is covered (the faded EYVAN logo),
 * so what was on screen does not show there. Android 13+ also leaves the switcher preview out natively
 * (MainActivity: setRecentsScreenshotEnabled(false)); this cover is for the moment before and for older Androids.
 */
export function PrivacyCover(): React.JSX.Element | null {
  const theme = useTheme()
  const [covered, setCovered] = useState(AppState.currentState !== 'active' && AppState.currentState != null)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setCovered(state !== 'active'))
    return () => subscription.remove()
  }, [])
  if (!covered) return null
  return (
    <LogoPlaceholder
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceContainerLowest }]}
      logoShare={0.35}
    />
  )
}
