import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
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

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={applicant.fullName} onPress={onPress}>
      <Card>
        <Text style={[theme.typography('titleSm'), styles.title]}>{applicant.fullName}</Text>
        <Text style={[theme.typography('bodySm'), styles.subtitle]}>
          {applicant.city} • {applicant.phoneNumber}
        </Text>
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
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    budget: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
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
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    metaValue: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
