import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  Button,
  Card,
  ContextHeader,
  ErrorState,
  LoadingIndicator,
  NextAction,
  PipelineIndicator,
  StatusBadge
} from '@shared/components'
import { formatDateTime } from '@shared/utils/formatDate'
import type { DealStage } from '@infrastructure/database/repositories/DealRepository'
import { useDealDetail } from '../hooks/useDealDetail'
import { useDealService } from '../hooks/useDealService'
import { useDealActivity } from '../hooks/useDealActivity'
import { useLostReasons } from '../hooks/useLostReasons'
import { DealActivitySection } from '../components/DealActivitySection'
import { DealNotesSection } from '../components/DealNotesSection'
import { LostReasonDialog } from '../components/LostReasonDialog'
import { dealStageTone } from '../dealPipeline'
import { DEAL_STAGE_LABELS, getNextStage } from '../dealStageLabels'

type Props = NativeStackScreenProps<MainStackParamList, 'DealDetail'>

export function DealDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { dealId } = route.params
  const { session } = useAuth()
  const { deal, isLoading, error, refetch } = useDealDetail(dealId)
  const activity = useDealActivity(dealId)
  const service = useDealService()
  const lostReasons = useLostReasons()
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLostDialogVisible, setIsLostDialogVisible] = useState(false)

  async function handleSaveNotes(notes: string): Promise<void> {
    if (!service || !deal) {
      return
    }
    setActionError(null)
    setIsSavingNotes(true)
    try {
      await service.updateNotes(deal.id, notes)
      refetch()
    } catch {
      setActionError('ذخیره یادداشت با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsSavingNotes(false)
    }
  }

  async function handleTransition(toStage: DealStage | null, lostReasonId?: string): Promise<void> {
    if (!service || !deal || !session || !toStage) {
      return
    }
    setActionError(null)
    setIsTransitioning(true)
    try {
      await service.transitionStage(deal.id, toStage, session.userId, { lostReasonId })
      setIsLostDialogVisible(false)
      refetch()
      activity.refetch()
    } catch {
      setActionError('بروزرسانی مرحله معامله با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsTransitioning(false)
    }
  }

  const isTerminal = deal ? deal.currentStage === 'won' || deal.currentStage === 'lost' : false
  const nextStage = deal ? getNextStage(deal.currentStage) : null

  // design-system.md §17.2 — only the soonest not-done reminder actually
  // linked to this deal (via `dealId`), never a fabricated one.
  const nextReminder = activity.reminders
    ?.filter((reminder) => !reminder.isDone)
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())[0]

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری معامله با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : !deal ? (
          <View style={styles.centeredSection}>
            <ErrorState title="معامله پیدا نشد" />
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <ContextHeader
                primary={deal.property?.title ?? 'ملک نامشخص'}
                secondary={deal.applicant?.fullName ?? 'متقاضی نامشخص'}
              />
              {isTerminal ? (
                <StatusBadge
                  label={deal.currentStage === 'won' ? 'موفق' : 'لغوشده'}
                  tone={dealStageTone(deal.currentStage)}
                />
              ) : null}
            </View>

            {nextReminder ? (
              <NextAction
                title={nextReminder.title}
                timestamp={formatDateTime(nextReminder.remindAt)}
                actionLabel="پیگیری"
                isOverdue={new Date(nextReminder.remindAt).getTime() < Date.now()}
                onAction={() =>
                  navigateAcrossTabs(navigation, 'ReminderDetail', { reminderId: nextReminder.id })
                }
              />
            ) : null}

            <View style={styles.section}>
              <Text style={[theme.typography('titleMd'), styles.heading]}>مسیر معامله</Text>
              <PipelineIndicator stage={deal.currentStage} />
            </View>

            {!isTerminal ? (
              <View style={styles.stageActions}>
                {nextStage ? (
                  <Button
                    label={`پیشرفت به «${DEAL_STAGE_LABELS[nextStage]}»`}
                    variant="secondary"
                    loading={isTransitioning}
                    onPress={() => handleTransition(nextStage)}
                  />
                ) : null}
                <View style={styles.outcomeRow}>
                  <Button
                    label="موفق"
                    variant="secondary"
                    loading={isTransitioning}
                    onPress={() => handleTransition('won')}
                    style={styles.outcomeAction}
                  />
                  <Button
                    label="ناموفق"
                    variant="destructive"
                    onPress={() => setIsLostDialogVisible(true)}
                    style={styles.outcomeAction}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <SummaryBlock
                title={deal.property?.title ?? 'ملک نامشخص'}
                detail={
                  deal.property?.price != null
                    ? `${deal.property.price.toLocaleString('fa-IR')} تومان`
                    : deal.property?.city
                }
                onPress={
                  deal.property
                    ? () =>
                        navigateAcrossTabs(navigation, 'PropertyDetail', {
                          propertyId: deal.property!.id
                        })
                    : undefined
                }
                theme={theme}
                styles={styles}
              />
              <SummaryBlock
                title={deal.applicant?.fullName ?? 'متقاضی نامشخص'}
                detail={
                  deal.applicant?.minBudget != null || deal.applicant?.maxBudget != null
                    ? `بودجه: ${(deal.applicant?.minBudget ?? 0).toLocaleString('fa-IR')} تا ${(deal.applicant?.maxBudget ?? 0).toLocaleString('fa-IR')} تومان`
                    : deal.applicant?.city
                }
                onPress={
                  deal.applicant
                    ? () =>
                        navigateAcrossTabs(navigation, 'ApplicantDetail', {
                          applicantId: deal.applicant!.id
                        })
                    : undefined
                }
                theme={theme}
                styles={styles}
              />
            </View>

            <DealActivitySection
              stageHistory={activity.stageHistory}
              reminders={activity.reminders}
              isLoading={activity.isLoading}
              error={activity.error}
              onRetry={activity.refetch}
            />

            <DealNotesSection
              notes={deal.notes}
              isSaving={isSavingNotes}
              onSave={handleSaveNotes}
            />

            {actionError ? (
              <Text style={[theme.typography('bodySm'), styles.actionError]}>{actionError}</Text>
            ) : null}

            <View style={styles.actions}>
              <Button
                label="ایجاد قرارداد"
                onPress={() =>
                  navigateAcrossTabs(navigation, 'CreateContract', {
                    dealId: deal.id,
                    propertyId: deal.propertyId,
                    applicantId: deal.applicantId
                  })
                }
              />
              <Button
                label="افزودن پیگیری"
                variant="secondary"
                onPress={() =>
                  navigateAcrossTabs(navigation, 'CreateReminder', {
                    dealId: deal.id,
                    propertyId: deal.propertyId,
                    applicantId: deal.applicantId
                  })
                }
              />
            </View>

            <LostReasonDialog
              visible={isLostDialogVisible}
              reasons={lostReasons}
              isConfirming={isTransitioning}
              onConfirm={(reasonId) => handleTransition('lost', reasonId)}
              onCancel={() => setIsLostDialogVisible(false)}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

type SummaryBlockProps = {
  title: string
  detail?: string | null
  onPress?: () => void
  theme: Theme
  styles: ReturnType<typeof createStyles>
}

/** design-system.md §17.2 — compact two-line block, not a restated full detail card. */
function SummaryBlock({
  title,
  detail,
  onPress,
  theme,
  styles
}: SummaryBlockProps): React.JSX.Element {
  const content = (
    <Card style={styles.summaryCard}>
      <Text
        style={[theme.typography('titleSm'), styles.summaryTitle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      {detail ? (
        <Text
          style={[theme.typography('bodySm'), styles.summaryDetail]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {detail}
        </Text>
      ) : null}
    </Card>
  )

  if (!onPress) {
    return content
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.summaryPressable}
    >
      {content}
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    content: {
      padding: theme.layout.screenPaddingX,
      paddingBottom: theme.layout.screenPaddingBottom,
      gap: theme.layout.sectionSpacing
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    section: {
      gap: theme.spacing.space3
    },
    stageActions: {
      gap: theme.spacing.space2
    },
    outcomeRow: {
      flexDirection: 'row',
      gap: theme.spacing.space2
    },
    outcomeAction: {
      flex: 1
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    heading: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    summaryRow: {
      flexDirection: 'row',
      gap: theme.spacing.space3
    },
    summaryPressable: {
      flex: 1
    },
    summaryCard: {
      flex: 1
    },
    summaryTitle: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    summaryDetail: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    actionError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    actions: {
      gap: theme.spacing.space3
    }
  })
}
