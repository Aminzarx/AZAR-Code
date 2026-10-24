import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import type { DealStage } from '@infrastructure/database/repositories/DealRepository'
import { DEAL_STAGE_LABELS } from '@features/deal/dealStageLabels'
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

/**
 * v1.4.0 (Amin #4315): the real sub-stages of each group, in order. The
 * connector after the current group fills part of the way per sub-stage
 * (new → ⅓, contacted → ⅔ …) so moving a deal one step always moves the
 * indicator, and the exact stage name shows under the current group.
 */
const GROUP_STAGES: Record<'contact' | 'visit' | 'negotiation' | 'contract', DealStage[]> = {
  contact: ['new', 'contacted'],
  visit: ['interested', 'visit_scheduled', 'visited'],
  negotiation: ['negotiation', 'offer'],
  contract: ['contract']
}

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
  const subStages = GROUP_STAGES[group]
  // share of the way from the current group to the next one
  const currentFill = (subStages.indexOf(stage) + 1) / (subStages.length + 1)
  const exactLabel = DEAL_STAGE_LABELS[stage]

  return (
    <View style={styles.row}>
      {GROUP_ORDER.map((groupKey, index) => {
        const isCurrent = index === currentIndex
        const isPast = index < currentIndex
        // connector before this step = progress out of the previous group
        const fill = index - 1 < currentIndex ? 1 : index - 1 === currentIndex ? currentFill : 0
        return (
          <React.Fragment key={groupKey}>
            {index > 0 ? (
              <View style={styles.connector}>
                <View
                  testID={`pipeline-fill-${groupKey}`}
                  style={[styles.connectorFill, { width: `${Math.round(fill * 100)}%` }]}
                />
              </View>
            ) : null}
            <View style={styles.step}>
              <View
                style={[styles.dot, (isPast || isCurrent) && styles.dotActive, isCurrent && styles.dotCurrent]}
              />
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
              {isCurrent && exactLabel !== GROUP_LABEL[groupKey] ? (
                <Text style={[theme.typography('labelSm'), styles.exact]} numberOfLines={1}>
                  {exactLabel}
                </Text>
              ) : null}
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
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.outlineVariant,
      marginTop: 4,
      overflow: 'hidden'
    },
    connectorFill: {
      height: 3,
      alignSelf: 'flex-start',
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
    dotCurrent: {
      width: 12,
      height: 12,
      marginTop: -1,
      borderWidth: 2,
      borderColor: theme.colors.secondaryContainer
    },
    label: {
      color: theme.colors.outline
    },
    labelCurrent: {
      color: theme.colors.onSurface,
      fontWeight: '700'
    },
    exact: {
      color: theme.colors.secondary,
      fontSize: 10
    }
  })
}
