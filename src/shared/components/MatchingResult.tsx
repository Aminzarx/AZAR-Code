import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'
import { Icon } from './Icon'
import type { StatusTone } from '@shared/theme/tokens'

export type MatchingCriterionState = {
  key: string
  label: string
  matched: boolean
}

type Props = {
  title: string
  subtitle?: string
  /** Real, matching-engine-computed criteria (matchingService.ts) — never fabricated. */
  criteria: MatchingCriterionState[]
  onPress?: () => void
  primaryActionLabel?: string
  onPrimaryAction?: () => void
}

/**
 * design-system.md §4 Matching Result (v2.6.0) — the one reusable card
 * for a matching-engine result, used by the Matching Workspace and by
 * Property/Applicant Detail's compact "related records" section alike.
 *
 * §4's rule on scoring: the matching engine's `score` (matchingService.ts)
 * is a real weighted sum, but it is *not* normalized against a shifting
 * maximum (an applicant with only 2 stated preferences can't score above
 * their combined weight even at a perfect match) — showing it as a bare
 * "62%" would read as a weak match when it's actually a perfect one on
 * everything the applicant specified. So this component never shows the
 * raw score as a percentage. Instead: "X از Y معیار منطبق" (the honest,
 * unambiguous count) as the primary signal, plus a qualitative tone
 * (تطابق بالا / تطابق مناسب / تطابق محدود) derived from the *matched
 * fraction* for a fast visual read — see `matchTone` below.
 */
export function MatchingResult({
  title,
  subtitle,
  criteria,
  onPress,
  primaryActionLabel,
  onPrimaryAction
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const matchedCount = criteria.filter((criterion) => criterion.matched).length
  const tone = matchTone(matchedCount, criteria.length)
  const toneLabel = matchToneLabel(tone)

  const content = (
    <Card>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={[theme.typography('titleSm'), styles.title]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[theme.typography('bodySm'), styles.subtitle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <StatusBadge label={toneLabel} tone={tone} />
      </View>

      <Text style={[theme.typography('labelMd'), styles.matchCount]}>
        {matchedCount} از {criteria.length} معیار منطبق
      </Text>

      <View style={styles.criteriaRow}>
        {criteria.map((criterion) => (
          <View key={criterion.key} style={styles.criterionChip}>
            <Icon
              name={criterion.matched ? 'check' : 'close'}
              size="xs"
              color={criterion.matched ? theme.colors.success : theme.colors.outline}
            />
            <Text
              style={[
                theme.typography('labelSm'),
                styles.criterionLabel,
                !criterion.matched && styles.criterionLabelUnmatched
              ]}
            >
              {criterion.label}
            </Text>
          </View>
        ))}
      </View>

      {primaryActionLabel && onPrimaryAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryAction}
          style={styles.primaryAction}
        >
          <Text style={[theme.typography('labelMd'), styles.primaryActionLabel]}>
            {primaryActionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  )

  if (!onPress) {
    return content
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  )
}

/** Fraction of *stated* criteria matched, not a share of a fixed universe — see the component doc comment. */
export function matchTone(matchedCount: number, totalCount: number): StatusTone {
  if (totalCount === 0) {
    return 'neutral'
  }
  const fraction = matchedCount / totalCount
  if (fraction >= 0.75) {
    return 'positive'
  }
  if (fraction >= 0.4) {
    return 'inProgress'
  }
  return 'neutral'
}

function matchToneLabel(tone: StatusTone): string {
  switch (tone) {
    case 'positive':
      return 'تطابق بالا'
    case 'inProgress':
      return 'تطابق مناسب'
    default:
      return 'تطابق محدود'
  }
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.space3
    },
    identity: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    matchCount: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space3,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    criteriaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space2,
      marginTop: theme.spacing.space2
    },
    criterionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1
    },
    criterionLabel: {
      color: theme.colors.onSurface
    },
    criterionLabelUnmatched: {
      color: theme.colors.outline
    },
    primaryAction: {
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginTop: theme.spacing.space4
    },
    primaryActionLabel: {
      color: theme.colors.secondary
    }
  })
}
