import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import type { StatusTone } from '@shared/theme/tokens'

type Props = {
  label: string
  tone: StatusTone
}

/**
 * design-system.md §7 Status System (v2.4.0) — the one standard way to
 * show a property/applicant/deal/contract/reminder's state anywhere in
 * the app. Small tonal pill (never a saturated solid fill, never red for
 * "just inactive") — a dot + label, nothing louder. `tone` is one of the
 * 5 tones in `theme.status(tone)`, not a raw color, so every screen's
 * status reads consistently and a future dark theme repoints all of them
 * by changing 5 role names instead of hunting every screen.
 */
export function StatusBadge({ label, tone }: Props): React.JSX.Element {
  const theme = useTheme()
  const { background, foreground } = theme.status(tone)
  const styles = createStyles(theme, background, foreground)

  return (
    <View style={styles.badge} accessibilityRole="text">
      <View style={styles.dot} />
      <Text style={[theme.typography('labelSm'), styles.label]}>{label}</Text>
    </View>
  )
}

function createStyles(theme: Theme, background: string, foreground: string) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start',
      gap: theme.component.statusBadge.gap,
      paddingVertical: theme.component.statusBadge.paddingY,
      paddingHorizontal: theme.component.statusBadge.paddingX,
      borderRadius: theme.component.statusBadge.radius,
      backgroundColor: background
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.full,
      backgroundColor: foreground
    },
    label: {
      color: foreground
    }
  })
}
