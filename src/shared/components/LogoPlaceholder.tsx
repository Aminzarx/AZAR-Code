import React from 'react'
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@shared/theme'

const logo = require('../../assets/eyvan-logo.png')

/**
 * Amin #5107: where a photo can be but is not (yet) — the photos of a file or contract, the profile photo — a faded
 * grey EYVAN logo instead of an empty box or someone else's picture.
 */
export function LogoPlaceholder({
  style,
  logoShare = 0.5
}: {
  style?: StyleProp<ViewStyle>
  /** the logo's width as a share of the box */
  logoShare?: number
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={[styles.box, { backgroundColor: theme.colors.surfaceContainerHigh }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={logo}
        resizeMode="contain"
        style={[styles.logo, { width: `${Math.round(logoShare * 100)}%`, tintColor: theme.colors.outline }]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { height: '50%', opacity: 0.35 }
})
