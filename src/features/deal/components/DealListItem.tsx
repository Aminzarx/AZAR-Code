import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, MarqueeText } from '@shared/components'
import type { ReminderRecord } from '@infrastructure/database/repositories/ReminderRepository'
import type { DealStage } from '@infrastructure/database/repositories/DealRepository'
import { DEAL_STAGE_LABELS } from '@shared/data/dealStageLabels'
import { isSameCalendarDay } from '@shared/utils/formatDate'
import { moneyLine } from '@shared/utils/shortMoney'
import { dealFilterGroup } from '../dealPipeline'
import type { DealWithDetails } from '../types'

type Props = {
  deal: DealWithDetails
  /** Soonest not-done reminder linked to this deal, if one exists — computed once for the whole list, not per row (see `useIncompleteReminders`). */
  nextReminder?: ReminderRecord
  onPress: () => void
  /** v1.4.0: long-press opens the row's action sheet (delete) */
  onLongPress?: () => void
  /** v1.4.0: «ثبت نتیجه» — defaults to opening the deal */
  onRecordResult?: () => void
}

/** v1.4.0 (approved «معاملات» design): the four steps every deal walks through. */
const STEPS: readonly { label: string; stages: readonly DealStage[] }[] = [
  { label: 'پیشنهاد', stages: ['new', 'contacted'] },
  { label: 'بازدید', stages: ['interested', 'visit_scheduled', 'visited'] },
  { label: 'مذاکره', stages: ['negotiation', 'offer'] },
  { label: 'قرارداد', stages: ['contract'] }
]

function reachedSteps(stage: DealStage): number {
  if (stage === 'won') {
    return STEPS.length
  }
  if (stage === 'lost') {
    return 0
  }
  return STEPS.findIndex((step) => step.stages.includes(stage)) + 1
}

function whenText(iso: string): string {
  const now = new Date()
  const time = new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  if (isSameCalendarDay(iso, now)) {
    return `امروز ${time}`
  }
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (isSameCalendarDay(iso, tomorrow)) {
    return 'فردا'
  }
  return new Date(iso).toLocaleDateString('fa-IR-u-ca-persian', { month: 'long', day: 'numeric' })
}

/**
 * v1.4.0 (design batch 3, approved «معاملات» mockup): who → which file,
 * deal type and price, the stage tag, a four-step progress bar, then the
 * next follow-up and «ثبت نتیجه».
 */
export function DealListItem({
  deal,
  nextReminder,
  onPress,
  onLongPress,
  onRecordResult
}: Props): React.JSX.Element {
  const theme = useTheme()
  const isOverdue = Boolean(nextReminder) && new Date(nextReminder!.remindAt).getTime() < Date.now()
  const isToday = Boolean(nextReminder) && isSameCalendarDay(nextReminder!.remindAt, new Date())
  const styles = createStyles(theme)
  const group = dealFilterGroup(deal.currentStage)
  const reached = reachedSteps(deal.currentStage)
  const fillColor =
    group === 'won' ? theme.colors.success : group === 'lost' ? theme.colors.outline : theme.colors.primary
  const property = deal.property
  const subtitle = [
    property?.transactionType,
    property ? moneyLine(property.price, property.depositAmount, property.rentAmount) : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deal.property?.title ?? 'ملک نامشخص'} - ${deal.applicant?.fullName ?? 'متقاضی نامشخص'}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <Card>
        <View style={styles.titleRow}>
          <View style={styles.who}>
            <MarqueeText style={[theme.typography('titleSm'), styles.title]}>
              {deal.applicant?.fullName ?? 'متقاضی نامشخص'}
            </MarqueeText>
            <Text style={[theme.typography('titleSm'), styles.arrow]}>←</Text>
            <MarqueeText style={[theme.typography('titleSm'), styles.title, styles.shrink]}>
              {deal.property?.title ?? 'ملک نامشخص'}
            </MarqueeText>
          </View>
          <View style={[styles.tag, group === 'won' && styles.tagWon]}>
            <Text style={[theme.typography('labelSm'), group === 'won' ? styles.tagWonText : styles.tagText]}>
              {DEAL_STAGE_LABELS[deal.currentStage]}
            </Text>
          </View>
        </View>
        {subtitle ? (
          <MarqueeText style={[theme.typography('bodySm'), styles.muted]}>
            {subtitle}
          </MarqueeText>
        ) : null}

        <View style={styles.steps} testID="deal-steps">
          {STEPS.map((step, index) => (
            <View key={step.label} style={styles.step}>
              <View style={[styles.bar, { backgroundColor: index < reached ? fillColor : theme.colors.surfaceContainerHigh }]} />
              <Text style={[styles.stepLabel, index === reached - 1 && styles.stepLabelCurrent]}>{step.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          {nextReminder ? (
            <View style={[styles.pill, isToday || isOverdue ? styles.pillUrgent : styles.pillQuiet]}>
              {isToday || isOverdue ? <View style={styles.dot} /> : null}
              <MarqueeText
                style={[theme.typography('labelSm'), isToday || isOverdue ? styles.pillUrgentText : styles.pillQuietText]}>
                {`${nextReminder.title} ${whenText(nextReminder.remindAt)}`}
              </MarqueeText>
            </View>
          ) : (
            <View />
          )}
          {group !== 'won' && group !== 'lost' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="ثبت نتیجه" onPress={onRecordResult ?? onPress} hitSlop={8}>
              <Text style={[theme.typography('labelMd'), styles.action]}>ثبت نتیجه</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    who: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      flexShrink: 1
    },
    title: { color: theme.colors.onSurface },
    shrink: { flexShrink: 1 },
    arrow: { color: theme.colors.onSurfaceVariant },
    tag: {
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: 2,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.surfaceContainer
    },
    tagText: { color: theme.colors.onSurfaceVariant },
    tagWon: { backgroundColor: theme.colors.successContainer },
    tagWonText: { color: theme.colors.onSuccessContainer },
    muted: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: start
    },
    steps: {
      flexDirection: 'row',
      gap: theme.spacing.space2,
      marginTop: theme.spacing.space3
    },
    step: { flex: 1, gap: 4 },
    bar: { height: 4, borderRadius: 2 },
    stepLabel: {
      fontSize: 11,
      fontFamily: theme.typography('labelSm').fontFamily,
      color: theme.colors.outline,
      textAlign: 'center' // rtl-allow: step label centred under its dot
    },
    stepLabelCurrent: { color: theme.colors.onSurface, fontWeight: '700' },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2,
      marginTop: theme.spacing.space3,
      paddingTop: theme.spacing.space3,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space1,
      borderRadius: theme.radius.full,
      flexShrink: 1
    },
    pillUrgent: { backgroundColor: theme.colors.warningContainer },
    pillUrgentText: { color: theme.colors.onWarningContainer },
    pillQuiet: { backgroundColor: theme.colors.surfaceContainer },
    pillQuietText: { color: theme.colors.onSurfaceVariant },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.warning },
    action: { color: theme.colors.primary, fontWeight: '700' }
  })
}
