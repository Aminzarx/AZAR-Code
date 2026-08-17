import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { BackButton } from './BackButton'

type Props = {
  onBack: () => void
}

/**
 * Full-width header bar for pushed screens that don't use
 * `FormScreenContainer` (list/detail screens with no save action) — v2.9.1,
 * per explicit feedback that a bare `BackButton` floating at the top of a
 * screen's own padded content (no background, no bottom edge, no
 * consistent placement relative to the status bar) read as broken/
 * misplaced. Gives it the same visual container FormScreenContainer's own
 * header uses (background, bottom hairline, padding) so it reads as a
 * real header, not a stray icon. Render this as the first child of
 * `SafeAreaView`, OUTSIDE any padded content wrapper.
 */
export function ScreenHeaderBar({ onBack }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingVertical: theme.spacing.space3,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    }
  })
}
