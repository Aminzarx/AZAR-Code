import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, StatusBadge } from '@shared/components'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_TONES } from '../statusPresentation'
import type { ContractWithDetails } from '../types'

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
          <StatusBadge
            label={CONTRACT_STATUS_LABELS[contract.status]}
            tone={CONTRACT_STATUS_TONES[contract.status]}
          />
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
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    amount: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
