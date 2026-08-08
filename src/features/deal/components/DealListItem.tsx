import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import { DEAL_STATUS_LABELS } from '../dealStatusLabels'
import type { DealWithDetails } from '../types'

type Props = {
  deal: DealWithDetails
  onPress: () => void
}

export function DealListItem({ deal, onPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.property?.title ?? 'ملک نامشخص'} - ${deal.applicant?.fullName ?? 'متقاضی نامشخص'}`}
      onPress={onPress}
    >
      <Card>
        <View style={styles.header}>
          <Text style={[theme.typography('titleSm'), styles.title]}>
            {deal.property?.title ?? 'ملک نامشخص'}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={[theme.typography('labelSm'), styles.statusText]}>
              {DEAL_STATUS_LABELS[deal.status]}
            </Text>
          </View>
        </View>
        <Text style={[theme.typography('bodySm'), styles.subtitle]}>
          {deal.applicant?.fullName ?? 'متقاضی نامشخص'}
        </Text>
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
