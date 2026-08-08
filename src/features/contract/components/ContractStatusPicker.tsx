import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { CONTRACT_STATUSES } from '@infrastructure/database/repositories/ContractRepository'
import type { ContractStatus } from '../types'

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'فعال',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده'
}

type Props = {
  status: ContractStatus
  onChange: (status: ContractStatus) => void
  disabled?: boolean
}

export function ContractStatusPicker({ status, onChange, disabled }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row}>
      {CONTRACT_STATUSES.map((candidate) => {
        const isSelected = candidate === status
        return (
          <Pressable
            key={candidate}
            accessibilityRole="button"
            accessibilityLabel={STATUS_LABELS[candidate]}
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onChange(candidate)}
            style={[styles.chip, isSelected ? styles.chipSelected : styles.chipDefault]}
          >
            <Text
              style={[
                theme.typography('labelSm'),
                isSelected ? styles.labelSelected : styles.labelDefault
              ]}
            >
              {STATUS_LABELS[candidate]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space2
    },
    chip: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.space2,
      paddingHorizontal: theme.spacing.space4,
      minHeight: theme.touchTargetMinimum
    },
    chipDefault: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    chipSelected: {
      backgroundColor: theme.colors.primary
    },
    labelDefault: {
      color: theme.colors.onSurfaceVariant
    },
    labelSelected: {
      color: theme.colors.onPrimary
    }
  })
}
