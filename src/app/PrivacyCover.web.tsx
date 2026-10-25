import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { LogoPlaceholder } from '@shared/components'
import { useTheme } from '@shared/theme'

/**
 * Amin #5199 on the web (#5183): the screen is covered (the faded EYVAN logo) the moment the app leaves the screen:
 * the page is hidden (home button, app switcher, another tab) or the window loses focus. iPhone's app switcher
 * picture is taken after `blur`, so it shows the cover, not the files. A browser cannot block screenshots.
 */
export function PrivacyCover(): React.JSX.Element | null {
  const theme = useTheme()
  const [covered, setCovered] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const cover = () => setCovered(true)
    const uncover = () => setCovered(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', uncover)
    window.addEventListener('blur', cover)
    window.addEventListener('pagehide', cover)
    window.addEventListener('focus', uncover)
    window.addEventListener('pageshow', uncover)
    return () => {
      document.removeEventListener('visibilitychange', uncover)
      window.removeEventListener('blur', cover)
      window.removeEventListener('pagehide', cover)
      window.removeEventListener('focus', uncover)
      window.removeEventListener('pageshow', uncover)
    }
  }, [])
  if (!covered) return null
  return (
    <LogoPlaceholder
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceContainerLowest, zIndex: 1000 }]}
      logoShare={0.35}
    />
  )
}
