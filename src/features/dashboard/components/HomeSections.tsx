import React from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName, MarqueeText } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import type { DashboardFollowUp, DashboardMatchSummary, DashboardStat } from '../types'

/**
 * v1.3.0 (design batch 2, approved mockups azar-design/final): the Home
 * pieces — two add buttons, the matching banner, today's follow-ups, the
 * summary tiles and the first-steps checklist for a new account.
 */

type AddButtonsProps = {
  onAddProperty: () => void
  onAddApplicant: () => void
}

export function HomeAddButtons({ onAddProperty, onAddApplicant }: AddButtonsProps) {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.addRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="افزودن فایل ملکی"
        onPress={onAddProperty}
        style={[styles.addButton, styles.addPrimary]}
      >
        <Icon name="plus" size="sm" color={theme.colors.onPrimary} />
        <Text style={[theme.typography('titleSm'), styles.addPrimaryText]}>فایل ملکی</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="افزودن متقاضی"
        onPress={onAddApplicant}
        style={[styles.addButton, styles.addTonal]}
      >
        <Icon name="plus" size="sm" color={theme.colors.primary} />
        <Text style={[theme.typography('titleSm'), styles.addTonalText]}>متقاضی</Text>
      </Pressable>
    </View>
  )
}

type MatchBannerProps = {
  matches: DashboardMatchSummary
  onPress: () => void
}

export function MatchBanner({ matches, onPress }: MatchBannerProps) {
  const theme = useTheme()
  const styles = createStyles(theme)
  const title = `${toPersianDigits(String(matches.matchCount))} تطبیق`
  const subtitle = `برای ${toPersianDigits(String(matches.applicantCount))} متقاضی، فایل مناسب پیدا شد`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}، ${subtitle}`}
      onPress={onPress}
      style={styles.banner}
    >
      <Icon name="matching" size="sm" color={theme.colors.onSuccessContainer} />
      <View style={styles.bannerText}>
        <Text style={[theme.typography('titleSm'), styles.bannerTitle]}>{title}</Text>
        <Text style={[theme.typography('bodySm'), styles.bannerSubtitle]}>{subtitle}</Text>
      </View>
      <Icon name="chevron" size="sm" color={theme.colors.onSuccessContainer} />
    </Pressable>
  )
}

type FollowUpListProps = {
  followUps: DashboardFollowUp[]
  onSelect: (reminderId: string) => void
}

export function FollowUpList({ followUps, onSelect }: FollowUpListProps) {
  const theme = useTheme()
  const styles = createStyles(theme)
  if (followUps.length === 0) {
    return (
      <View style={[styles.box, styles.emptyBox]}>
        <Text style={[theme.typography('bodySm'), styles.muted]}>
          برای امروز پیگیری‌ای ثبت نشده است.
        </Text>
      </View>
    )
  }
  return (
    <View style={styles.box}>
      {followUps.map((item, index) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => onSelect(item.id)}
          style={[styles.followUpRow, index > 0 && styles.rowDivider]}
        >
          <View style={[styles.timeChip, item.isOverdue && styles.timeChipOverdue]}>
            <Text
              style={[
                theme.typography('labelSm'),
                styles.timeText,
                item.isOverdue && styles.timeTextOverdue
              ]}
            >
              {item.timeLabel}
            </Text>
          </View>
          <View style={styles.followUpText}>
            <MarqueeText
              style={[theme.typography('titleSm'), styles.rowTitle]}>
              {item.title}
            </MarqueeText>
            {item.subtitle ? (
              <MarqueeText
                style={[theme.typography('bodySm'), styles.muted, styles.start]}>
                {item.subtitle}
              </MarqueeText>
            ) : null}
          </View>
          {item.phoneNumber ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تماس با ${item.subtitle ?? item.title}`}
              onPress={() => {
                Linking.openURL(`tel:${item.phoneNumber}`).catch(() => undefined)
              }}
              style={styles.callButton}
            >
              <Icon name="phone" size="sm" color={theme.colors.success} />
            </Pressable>
          ) : null}
        </Pressable>
      ))}
    </View>
  )
}

type SummaryTilesProps = {
  stats: DashboardStat[]
  onSelect: (id: DashboardStat['id']) => void
}

export function SummaryTiles({ stats, onSelect }: SummaryTilesProps) {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.tilesRow}>
      {stats.map((stat) => (
        <Pressable
          key={stat.id}
          accessibilityRole="button"
          accessibilityLabel={`${stat.label}: ${stat.value}`}
          onPress={() => onSelect(stat.id)}
          style={styles.tile}
        >
          <Text style={[theme.typography('headlineLgMobile'), styles.tileValue]}>
            {toPersianDigits(String(stat.value))}
          </Text>
          <MarqueeText
            style={[theme.typography('labelSm'), styles.tileLabel]}>
            {stat.label}
          </MarqueeText>
        </Pressable>
      ))}
    </View>
  )
}

type FirstStepsProps = {
  hasProperty: boolean
  hasApplicant: boolean
  onAddProperty: () => void
  onAddApplicant: () => void
}

/** New account: «سه قدم تا اولین تطبیق» — sign-up is already done. */
export function FirstStepsCard({
  hasProperty,
  hasApplicant,
  onAddProperty,
  onAddApplicant
}: FirstStepsProps) {
  const theme = useTheme()
  const styles = createStyles(theme)
  const steps: {
    id: string
    title: string
    hint: string
    done: boolean
    onAdd?: () => void
  }[] = [
    { id: 'signup', title: 'ثبت‌نام', hint: 'انجام شد', done: true },
    {
      id: 'property',
      title: 'اولین فایل ملکی',
      hint: 'حدود یک دقیقه',
      done: hasProperty,
      onAdd: onAddProperty
    },
    {
      id: 'applicant',
      title: 'اولین متقاضی',
      hint: 'بعد از آن تطبیق خودکار شروع می‌شود',
      done: hasApplicant,
      onAdd: onAddApplicant
    }
  ]
  return (
    <View style={styles.box}>
      {steps.map((step, index) => (
        <View key={step.id} style={[styles.stepRow, index > 0 && styles.rowDivider]}>
          <View style={[styles.stepMark, step.done && styles.stepMarkDone]}>
            {step.done ? <Icon name="check" size="xs" color={theme.colors.onSuccess} /> : null}
          </View>
          <View style={styles.followUpText}>
            <Text style={[theme.typography('titleSm'), styles.rowTitle]}>{step.title}</Text>
            <Text style={[theme.typography('bodySm'), styles.muted, styles.start]}>
              {step.done ? 'انجام شد' : step.hint}
            </Text>
          </View>
          {!step.done && step.onAdd ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`افزودن ${step.title}`}
              onPress={step.onAdd}
              hitSlop={8}
            >
              <Text style={[theme.typography('labelMd'), styles.stepAction]}>افزودن</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  )
}

export function SectionHeader({
  title,
  actionLabel,
  onAction
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.sectionHeader}>
      <Text style={[theme.typography('titleMd'), styles.rowTitle]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[theme.typography('labelMd'), styles.muted]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function RoundIconButton({
  icon,
  accessibilityLabel,
  onPress,
  showDot,
  count = 0
}: {
  icon: IconName
  accessibilityLabel: string
  onPress: () => void
  showDot?: boolean
  /** Amin #6214: a red number (new announcements); it takes the dot's place */
  count?: number
}) {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.roundButton}
    >
      <Icon name={icon} size="sm" color={theme.colors.onSurface} />
      {count > 0 ? (
        <View style={styles.countBadge}>
          <Text style={[theme.typography('labelMd'), styles.countText]}>{toPersianDigits(count > 99 ? '99+' : String(count))}</Text>
        </View>
      ) : showDot ? (
        <View style={styles.dot} />
      ) : null}
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    start: { alignSelf: start },
    addRow: { flexDirection: 'row', gap: theme.spacing.space3 },
    addButton: {
      flex: 1,
      minHeight: 56,
      borderRadius: theme.radius.extraLarge,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.space2
    },
    addPrimary: { backgroundColor: theme.colors.primary },
    addPrimaryText: { color: theme.colors.onPrimary },
    addTonal: { backgroundColor: theme.colors.surfaceContainer },
    addTonalText: { color: theme.colors.primary },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space4,
      borderRadius: theme.radius.extraLarge,
      backgroundColor: theme.colors.successContainer
    },
    bannerText: { flex: 1, gap: 2 },
    bannerTitle: { color: theme.colors.onSuccessContainer, alignSelf: start },
    bannerSubtitle: { color: theme.colors.onSuccessContainer, alignSelf: start },
    box: {
      borderRadius: theme.radius.extraLarge,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden'
    },
    emptyBox: { padding: theme.spacing.space4, alignItems: 'center' },
    followUpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      minHeight: 64
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant },
    timeChip: {
      minWidth: 56,
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: theme.spacing.space1,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.surfaceContainerLow,
      alignItems: 'center'
    },
    timeChipOverdue: { backgroundColor: theme.colors.warningContainer },
    timeText: { color: theme.colors.onSurface },
    timeTextOverdue: { color: theme.colors.onWarningContainer },
    followUpText: { flex: 1, gap: 2, minWidth: 0 },
    rowTitle: { color: theme.colors.onSurface, alignSelf: start, flexShrink: 1 },
    muted: { color: theme.colors.onSurfaceVariant },
    callButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center'
    },
    tilesRow: { flexDirection: 'row', gap: theme.spacing.space2 },
    tile: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.space4,
      paddingHorizontal: theme.spacing.space1,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      gap: theme.spacing.space1
    },
    tileValue: { color: theme.colors.onSurface },
    tileLabel: { color: theme.colors.onSurfaceVariant },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space4,
      minHeight: 72
    },
    stepMark: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      alignItems: 'center',
      justifyContent: 'center'
    },
    stepMarkDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    stepAction: { color: theme.colors.primary },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    roundButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center'
    },
    countBadge: {
      position: 'absolute',
      top: 4,
      end: 4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error
    },
    countText: { color: theme.colors.onError, fontSize: 12, lineHeight: 16 },
    dot: {
      position: 'absolute',
      top: 10,
      end: 12,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.error
    }
  })
}
