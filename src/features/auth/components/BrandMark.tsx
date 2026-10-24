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
    <View style={[styles.tile, inverse ? styles.tileInverse : null]} accessibilityLabel="EYVAN">
      <Text style={[theme.typography('titleMd'), styles.text, inverse ? styles.textInverse : null]}>
        EYVAN
      </Text>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    // v1.3.0: «EYVAN» is wider than «AZAR»; the tile grows with the word.
    tile: {
      minWidth: 64,
      height: 64,
      paddingHorizontal: theme.spacing.space4,
      borderRadius: theme.radius.extraLarge,
      backgroundColor: theme.colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginBottom: theme.spacing.space6
    },
    tileInverse: {
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    text: {
      color: theme.colors.onBrand,
      letterSpacing: 1
    },
    textInverse: {
      color: theme.colors.primary
    }
  })
}
