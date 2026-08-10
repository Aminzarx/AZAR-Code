import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import type { DealStage } from '@infrastructure/database/repositories/DealRepository'
import { StatusBadge } from './StatusBadge'

/**
 * design-system.md §7 Deal Pipeline (v2.6.0) — `DealStage`'s real
 * 9-stage pipeline (crm-architecture-audit-v1.md §E.1) collapsed into 4
 * visual groups plus 2 terminal outcomes, so the compact indicator never
 * becomes a heavy 9-step stepper on a phone screen. The underlying
 * `currentStage` value is untouched — this is a display grouping only.
 */
const STAGE_GROUP: Record<
  DealStage,
  'contact' | 'visit' | 'negotiation' | 'contract' | 'won' | 'lost'
> = {
  new: 'contact',
  contacted: 'contact',
  interested: 'visit',
  visit_scheduled: 'visit',
  visited: 'visit',
  negotiation: 'negotiation',
  offer: 'negotiation',
  contract: 'contract',
  won: 'won',
  lost: 'lost'
}

const GROUP_LABEL: Record<'contact' | 'visit' | 'negotiation' | 'contract', string> = {
  contact: 'تماس',
  visit: 'بازدید',
  negotiation: 'مذاکره',
  contract: 'قرارداد'
}

const GROUP_ORDER: ('contact' | 'visit' | 'negotiation' | 'contract')[] = [
  'contact',
  'visit',
  'negotiation',
  'contract'
]

type Props = {
  stage: DealStage
}

export function PipelineIndicator({ stage }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const group = STAGE_GROUP[stage]

  if (group === 'won' || group === 'lost') {
    return (
      <StatusBadge
        label={group === 'won' ? 'موفق' : 'لغوشده'}
        tone={group === 'won' ? 'highlight' : 'neutral'}
      />
    )
  }

  const currentIndex = GROUP_ORDER.indexOf(group)

  return (
    <View style={styles.row}>
      {GROUP_ORDER.map((groupKey, index) => {
        const isCurrent = index === currentIndex
        const isPast = index < currentIndex
        return (
          <React.Fragment key={groupKey}>
            {index > 0 ? (
              <View style={[styles.connector, (isPast || isCurrent) && styles.connectorActive]} />
            ) : null}
            <View style={styles.step}>
              <View style={[styles.dot, (isPast || isCurrent) && styles.dotActive]} />
              <Text
                style={[
                  theme.typography('labelSm'),
                  styles.label,
                  isCurrent && styles.labelCurrent
                ]}
                numberOfLines={1}
              >
                {GROUP_LABEL[groupKey]}
              </Text>
            </View>
          </React.Fragment>
        )
      })}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start'
    },
    step: {
      alignItems: 'center',
      gap: theme.spacing.space1,
      minWidth: 44
    },
    connector: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginTop: 5
    },
    connectorActive: {
      backgroundColor: theme.colors.secondary
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.outlineVariant
    },
    dotActive: {
      backgroundColor: theme.colors.secondary
    },
    label: {
      color: theme.colors.outline
    },
    labelCurrent: {
      color: theme.colors.onSurface
    }
  })
}
