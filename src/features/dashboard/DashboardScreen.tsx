import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  ActivityTimeline,
  Avatar,
  Button,
  ErrorState,
  Icon,
  LoadingIndicator
} from '@shared/components'
import { useDisplayName } from '@shared/hooks/useDisplayName'
import { getTimeBasedGreeting } from '@shared/utils/greeting'
import { useDashboardData } from './hooks/useDashboardData'
import { StatCard } from './components/StatCard'
import { NeedsAttentionList } from './components/NeedsAttentionList'
import { QuickActions, type QuickAction } from './components/QuickActions'
import { UpcomingRemindersList } from './components/UpcomingRemindersList'
import type { DashboardActivity, DashboardNeedsAttentionItem } from './types'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>

export function DashboardScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const { data, isLoading, error, refetch } = useDashboardData(session?.userId ?? '')
  const { displayName } = useDisplayName()
  const greeting = getTimeBasedGreeting()

  // design-system.md §14 point 4 — exactly the two primary actions get the
  // elevated/prominent treatment; every other Dashboard action (below)
  // renders as a visually secondary row instead.
  const primaryActions: QuickAction[] = [
    {
      id: 'add-property',
      label: 'افزودن فایل ملکی',
      icon: 'files',
      onPress: () => navigateAcrossTabs(navigation, 'CreateProperty', undefined)
    },
    {
      id: 'add-applicant',
      label: 'افزودن متقاضی',
      icon: 'person',
      onPress: () => navigateAcrossTabs(navigation, 'CreateApplicant', undefined)
    }
  ]

  function handleNeedsAttentionSelect(item: DashboardNeedsAttentionItem): void {
    navigateAcrossTabs(navigation, item.target, undefined)
  }

  function handleActivitySelect(item: DashboardActivity): void {
    switch (item.entityType) {
      case 'property':
        navigateAcrossTabs(navigation, 'PropertyDetail', { propertyId: item.entityId })
        break
      case 'applicant':
        navigateAcrossTabs(navigation, 'ApplicantDetail', { applicantId: item.entityId })
        break
      case 'deal':
        navigateAcrossTabs(navigation, 'DealDetail', { dealId: item.entityId })
        break
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="داشبورد">
        <Pressable
          onPress={() => navigateAcrossTabs(navigation, 'Settings', undefined)}
          accessibilityRole="button"
          accessibilityLabel="مشاهده پروفایل و تنظیمات"
          style={styles.header}
        >
          <View style={styles.headerLeading}>
            <Avatar name={displayName ?? 'کاربر آزار'} size="lg" />
            <View style={styles.headerText}>
              <Text
                style={[theme.typography('headlineLgMobile'), styles.greeting]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {greeting}
                {displayName ? `، ${displayName}` : ''}
              </Text>
            </View>
          </View>
          <Icon name="chevron" size="sm" color={theme.colors.outline} />
        </Pressable>

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری داشبورد با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : (
          data && (
            <>
              {/* design-system.md §14 point 2 — Today/Overview, kept quiet (StatCard's `flat` Card), no heading needed. */}
              <View style={styles.statsRow}>
                {data.stats.map((stat) => (
                  <StatCard
                    key={stat.id}
                    stat={stat}
                    onPress={
                      stat.id === 'properties'
                        ? () => navigateAcrossTabs(navigation, 'PropertyList', undefined)
                        : stat.id === 'applicants'
                          ? () => navigateAcrossTabs(navigation, 'ApplicantList', undefined)
                          : stat.id === 'deals'
                            ? () => navigateAcrossTabs(navigation, 'DealList', undefined)
                            : stat.id === 'contracts'
                              ? () => navigateAcrossTabs(navigation, 'ContractList', undefined)
                              : undefined
                    }
                  />
                ))}
              </View>

              {/* design-system.md §14 point 3 — Needs Attention; renders nothing at all when empty, per the spec (no empty heading with nothing under it). */}
              {data.needsAttention.length > 0 ? (
                <View style={styles.section}>
                  <Text
                    style={[theme.typography('titleMd'), styles.sectionTitle]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    نیازمند توجه
                  </Text>
                  <NeedsAttentionList
                    items={data.needsAttention}
                    onSelect={handleNeedsAttentionSelect}
                  />
                </View>
              ) : null}

              <View style={styles.section}>
                <Text
                  style={[theme.typography('titleMd'), styles.sectionTitle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  اقدامات سریع
                </Text>
                <QuickActions actions={primaryActions} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="مشاهده پیگیری‌ها"
                  onPress={() => navigateAcrossTabs(navigation, 'DealList', undefined)}
                  style={styles.secondaryAction}
                >
                  <Icon name="deal" size="xs" color={theme.colors.onSurfaceVariant} />
                  <Text style={[theme.typography('labelMd'), styles.secondaryActionLabel]}>
                    مشاهده پیگیری‌ها
                  </Text>
                  <Icon name="chevron" size="xs" color={theme.colors.outline} />
                </Pressable>
              </View>

              <View style={styles.section}>
                <Text
                  style={[theme.typography('titleMd'), styles.sectionTitle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  آخرین فعالیت‌ها
                </Text>
                <ActivityTimeline
                  activity={data.recentActivity}
                  emptyDescription="با افزودن فایل‌های ملکی و متقاضیان، آخرین فعالیت‌های شما اینجا نمایش داده می‌شود."
                  onSelect={handleActivitySelect}
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text
                    style={[theme.typography('titleMd'), styles.sectionTitle]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    یادآوری‌های نزدیک
                  </Text>
                  <Button
                    label="مشاهده همه"
                    variant="text"
                    fullWidth={false}
                    onPress={() => navigation.navigate('ReminderList', undefined)}
                  />
                </View>
                <UpcomingRemindersList
                  reminders={data.upcomingReminders}
                  onSelect={(reminderId) => navigation.navigate('ReminderDetail', { reminderId })}
                />
              </View>
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    content: {
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingTop: theme.layout.screenPaddingX,
      paddingBottom: theme.layout.screenPaddingBottom,
      gap: theme.layout.sectionSpacing
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space4
    },
    // See QuickActions.tsx's `leading` comment — the avatar and greeting
    // stay grouped in their own row so `justifyContent: 'space-between'`
    // only pushes the chevron to the opposite edge, not the greeting text
    // itself away from the avatar it belongs next to.
    headerLeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space4,
      flexShrink: 1,
      minWidth: 0
    },
    headerText: {
      flexShrink: 1,
      minWidth: 0
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    greeting: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.component.statCardGrid.gap
    },
    section: {
      gap: theme.layout.componentSpacing
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      flexShrink: 1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    // design-system.md §14 point 4 — every Dashboard action besides the two
    // primary ones reads as visually secondary: no Card, no elevation,
    // smaller than the primary actions' row.
    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      minHeight: theme.touchTargetMinimum,
      paddingHorizontal: theme.spacing.space2
    },
    secondaryActionLabel: {
      flexShrink: 1,
      color: theme.colors.onSurfaceVariant
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    }
  })
}
