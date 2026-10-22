import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  /** `inverse`: white tile on the dark welcome header. */
  inverse?: boolean
}

/** v3.0.0: the app's mark on the sign-in pages, in the kssx.ir navy. */
export function BrandMark({ inverse }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={[styles.tile, inverse ? styles.tileInverse : null]} accessibilityLabel="AZAR">
      <Text style={[theme.typography('titleMd'), styles.text, inverse ? styles.textInverse : null]}>
        AZAR
      </Text>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    tile: {
      width: 64,
      height: 64,
      borderRadius: theme.radius.extraLarge,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginBottom: theme.spacing.space6
    },
    tileInverse: {
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    text: {
      color: theme.colors.onPrimary,
      letterSpacing: 1
    },
    textInverse: {
      color: theme.colors.primary
    }
  })
}
