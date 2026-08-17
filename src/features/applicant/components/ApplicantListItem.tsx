import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EntityIconBadge, StatusBadge } from '@shared/components'
import { baseApplicantStatus } from '../statusDerivation'
import type { Applicant } from '../types'

type Props = {
  applicant: Applicant
  onPress: () => void
}

function formatBudgetRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) {
    return null
  }
  if (min !== null && max !== null) {
    return `${min.toLocaleString('fa-IR')} تا ${max.toLocaleString('fa-IR')} تومان`
  }
  const value = min ?? max
  return `${value?.toLocaleString('fa-IR')} تومان`
}

export function ApplicantListItem({ applicant, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const budgetLabel = formatBudgetRange(applicant.minBudget, applicant.maxBudget)
  const status = baseApplicantStatus(applicant.status)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={applicant.fullName} onPress={onPress}>
      <Card>
        <View style={styles.titleRow}>
          <EntityIconBadge icon="person" tone="tertiary" />
          <View style={styles.identity}>
            <Text
              style={[theme.typography('titleSm'), styles.title]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {applicant.fullName}
            </Text>
            <Text
              style={[theme.typography('bodySm'), styles.subtitle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {applicant.city} • {applicant.phoneNumber}
            </Text>
          </View>
          <StatusBadge label={status.label} tone={status.tone} />
        </View>
        {budgetLabel ? (
          <Text style={[theme.typography('labelMd'), styles.budget]}>{budgetLabel}</Text>
        ) : null}
        {applicant.rooms !== null || applicant.preferredPropertyType ? (
          <View style={styles.metaGrid}>
            {applicant.preferredPropertyType ? (
              <View style={styles.metaCell}>
                <Text style={[theme.typography('bodySm'), styles.metaLabel]}>نوع ملک مدنظر</Text>
                <Text style={[theme.typography('labelMd'), styles.metaValue]}>
                  {applicant.preferredPropertyType}
                </Text>
              </View>
            ) : null}
            {applicant.rooms !== null ? (
              <View style={styles.metaCell}>
                <Text style={[theme.typography('bodySm'), styles.metaLabel]}>تعداد اتاق</Text>
                <Text style={[theme.typography('labelMd'), styles.metaValue]}>
                  {applicant.rooms} اتاق
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3
    },
    identity: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container (here,
    // `identity`) doesn't reliably stretch to full width, so alignSelf
    // anchors the box to the correct edge; flexShrink is separately
    // needed so long titles/subtitles truncate instead of overflowing
    // the row now that a badge and StatusBadge also share it.
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    budget: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space3
    },
    metaCell: {
      flexBasis: theme.component.statCardGrid.columnBasisPercent,
      flexGrow: 0,
      gap: theme.spacing.space1
    },
    metaLabel: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    metaValue: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
