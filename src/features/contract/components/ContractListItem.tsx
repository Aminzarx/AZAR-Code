import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EntityIconBadge, StatusBadge } from '@shared/components'
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
          <EntityIconBadge icon="contract" tone="secondary" />
          <View style={styles.identity}>
            <Text
              style={[theme.typography('titleSm'), styles.title]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {contract.property?.title ?? 'ملک نامشخص'}
            </Text>
            <Text
              style={[theme.typography('bodySm'), styles.subtitle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {contract.applicant?.fullName ?? 'متقاضی نامشخص'}
            </Text>
          </View>
          <StatusBadge
            label={CONTRACT_STATUS_LABELS[contract.status]}
            tone={CONTRACT_STATUS_TONES[contract.status]}
          />
        </View>
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
      alignItems: 'center',
      gap: theme.spacing.space3
    },
    identity: {
      flex: 1,
      gap: theme.spacing.space1
    },
    // design-system.md §10 — a short Text in a column container (here,
    // `identity`) doesn't reliably stretch to full width, so alignSelf
    // anchors the box to the correct edge.
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
    amount: {
      color: theme.colors.primary,
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
