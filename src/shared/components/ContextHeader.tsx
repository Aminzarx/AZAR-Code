import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'

type Props = {
  /** e.g. a property title */
  primary: string
  /** e.g. an applicant's name — omit for single-entity screens (Reminder tied to only one record). */
  secondary?: string
}

/**
 * design-system.md §22 Context Header (v2.6.0) — for screens one level
 * removed from the record itself (Deal Detail, Contract Detail, a
 * Reminder tied to a property/applicant), so the user never loses track
 * of which record(s) they're looking at. Not a navigation control, purely
 * identity — sits below the screen's own title/status.
 */
export function ContextHeader({ primary, secondary }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row}>
      <Text
        style={[theme.typography('bodyMd'), styles.text]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {primary}
      </Text>
      {secondary ? (
        <>
          <Icon name="close" size="xs" color={theme.colors.outline} />
          <Text
            style={[theme.typography('bodyMd'), styles.text]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {secondary}
          </Text>
        </>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.space2
    },
    text: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1
    }
  })
}
