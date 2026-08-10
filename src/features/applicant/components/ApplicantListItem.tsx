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
        <View style={styles.metaRow}>
          {budgetLabel ? (
            <Text style={[theme.typography('labelMd'), styles.budget]}>{budgetLabel}</Text>
          ) : null}
          {applicant.rooms !== null ? (
            <Text style={[theme.typography('labelSm'), styles.meta]}>{applicant.rooms} اتاق</Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    title: {
      color: theme.colors.onSurface
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    metaRow: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space2
    },
    budget: {
      color: theme.colors.primary
    },
    meta: {
      color: theme.colors.outline
    }
  })
}
