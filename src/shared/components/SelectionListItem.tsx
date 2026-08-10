import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from './Card'
import { Icon, type IconName } from './Icon'
import { EntityIconBadge, type EntityBadgeTone } from './EntityIconBadge'

type Props = {
  icon: IconName
  title: string
  subtitle?: string
  /** Which brand accent tints the icon badge — one tone per list, never mixed within a single screen (design-system.md §0.2's "one accent moment"). */
  tone?: EntityBadgeTone
  onPress: () => void
  selected?: boolean
}

/**
 * design-system.md §7 Selection List Row (v2.7.0) — a lighter row for
 * "pick one record to act on next" contexts (the Matching Workspace's
 * property/applicant picker, and any future record-picker), distinct
 * from the full `PropertyListItem`/`ApplicantListItem` cards used in
 * their own list screens: those carry status/price/meta-grid detail a
 * quick picker step doesn't need. Adapts the icon-badge + bold-title +
 * subtitle + trailing-indicator pattern (colored circular icon badge,
 * confident title weight, quiet subtitle, minimal shadow) using AZAR's
 * own bronze/emerald accents in place of a generic brand-neutral color,
 * per §0.2's "restrained, deliberate accent" rule — never a rainbow of
 * per-row colors.
 */
export function SelectionListItem({
  icon,
  title,
  subtitle,
  tone = 'secondary',
  onPress,
  selected = false
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme, selected)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <EntityIconBadge icon={icon} tone={tone} />
          <View style={styles.textColumn}>
            <Text
              style={[theme.typography('titleSm'), styles.title]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[theme.typography('bodySm'), styles.subtitle]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Icon
            name={selected ? 'check' : 'chevron'}
            size="sm"
            color={selected ? theme.colors.secondary : theme.colors.outline}
          />
        </View>
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme, selected: boolean) {
  return StyleSheet.create({
    card: {
      borderWidth: selected ? 1 : 0,
      borderColor: theme.colors.secondary
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3
    },
    textColumn: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
