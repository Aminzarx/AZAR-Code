import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import type { ContractWithDetails } from '../types'

const STATUS_LABELS: Record<ContractWithDetails['status'], string> = {
  active: 'فعال',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده'
}

type Props = {
  contract: ContractWithDetails
  onPress: () => void
}

export function ContractListItem({ contract, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const label = `${contract.property?.title ?? 'ملک نامشخص'} - ${contract.applicant?.fullName ?? 'متقاضی نامشخص'}`

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Card>
        <View style={styles.header}>
          <Text style={[theme.typography('titleSm'), styles.title]}>
            {contract.property?.title ?? 'ملک نامشخص'}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={[theme.typography('labelSm'), styles.statusText]}>
              {STATUS_LABELS[contract.status]}
            </Text>
          </View>
        </View>
        <Text style={[theme.typography('bodySm'), styles.subtitle]}>
          {contract.applicant?.fullName ?? 'متقاضی نامشخص'}
        </Text>
        {contract.amount !== null ? (
          <Text style={[theme.typography('labelMd'), styles.amount]}>
            {contract.amount.toLocaleString('fa-IR')} تومان
          </Text>
        ) : null}
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    title: {
      color: theme.colors.onSurface,
      flex: 1
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    amount: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2
    },
    statusBadge: {
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3
    },
    statusText: {
      color: theme.colors.onSecondaryContainer
    }
  })
}
