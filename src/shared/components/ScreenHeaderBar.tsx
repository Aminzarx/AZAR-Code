import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { BackButton } from './BackButton'

type Props = {
  onBack: () => void
  /**
   * v2.9.5 — per explicit feedback, a `BackButton` should never sit
   * alone in its own row with nothing beside it; pairing it with the
   * screen's title (same [back][title] layout `FormScreenContainer`'s
   * own header already uses) gives it a clear anchor.
   */
  title?: string
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
export function ScreenHeaderBar({ onBack, title }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
      {title ? (
        <Text
          style={[theme.typography('titleSm'), styles.title]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingVertical: theme.spacing.space3,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    }
  })
}
