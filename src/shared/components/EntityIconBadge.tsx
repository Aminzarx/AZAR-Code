import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@shared/theme'
import { Icon, type IconName } from './Icon'

export type EntityBadgeTone = 'secondary' | 'tertiary'

type Props = {
  icon: IconName
  tone?: EntityBadgeTone
  size?: number
}

/**
 * design-system.md §17.8 — the circular colored icon badge introduced by
 * `SelectionListItem`, extracted so every list row across the app (not
 * just picker rows) can lead with the same identity marker. One tone per
 * screen/list (never mixed within a single list — §0.2's "one accent,
 * deliberately"): `secondary` (bronze) for property/contract rows,
 * `tertiary` (emerald) for applicant/deal rows.
 */
export function EntityIconBadge({ icon, tone = 'secondary', size = 44 }: Props): React.JSX.Element {
  const theme = useTheme()
  const container =
    tone === 'secondary' ? theme.colors.secondaryContainer : theme.colors.tertiaryContainer
  const onContainer =
    tone === 'secondary' ? theme.colors.onSecondaryContainer : theme.colors.onTertiaryContainer

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: theme.radius.full, backgroundColor: container }
      ]}
    >
      <Icon name={icon} size="sm" color={onContainer} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center'
  }
})
