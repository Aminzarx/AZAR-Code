import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Avatar, ErrorState, Icon, LoadingIndicator } from '@shared/components'
import { useDashboardData } from './hooks/useDashboardData'
import { StatCard } from './components/StatCard'
import { QuickActions, type QuickAction } from './components/QuickActions'
import { RecentActivityList } from './components/RecentActivityList'
import { UpcomingRemindersList } from './components/UpcomingRemindersList'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>

export function DashboardScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const { data, isLoading, error, refetch } = useDashboardData(session?.userId ?? '')

  const quickActions: QuickAction[] = [
    {
      id: 'add-property',
      label: 'افزودن پرونده ملکی',
      icon: 'files',
      onPress: () => navigation.navigate('CreateProperty')
    },
    {
      id: 'add-applicant',
      label: 'افزودن متقاضی',
      icon: 'person',
      onPress: () => navigation.navigate('CreateApplicant')
    },
    {
      id: 'deals',
      label: 'مشاهده پیگیری‌ها',
      icon: 'matching',
      onPress: () => navigation.navigate('DealList')
    }
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="داشبورد">
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="مشاهده پروفایل و تنظیمات"
          style={styles.header}
        >
          <Avatar name="کاربر آزار" size="lg" />
          <View style={styles.headerText}>
            <Text
              style={[theme.typography('headlineLgMobile'), styles.greeting]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              خوش آمدید
            </Text>
            {session?.referralCode ? (
              <Text
                style={[theme.typography('bodySm'), styles.headerSubtitle]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                کد معرف: {session.referralCode}
              </Text>
            ) : null}
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
              <View style={styles.statsRow}>
                {data.stats.map((stat) => (
                  <StatCard
                    key={stat.id}
                    stat={stat}
                    onPress={
                      stat.id === 'properties'
                        ? () => navigation.navigate('PropertyList')
                        : stat.id === 'applicants'
                          ? () => navigation.navigate('ApplicantList')
                          : stat.id === 'deals'
                            ? () => navigation.navigate('DealList')
                            : stat.id === 'contracts'
                              ? () => navigation.navigate('ContractList')
                              : undefined
                    }
                  />
                ))}
              </View>

              <View style={styles.section}>
                <Text
                  style={[theme.typography('titleMd'), styles.sectionTitle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  اقدامات سریع
                </Text>
                <QuickActions actions={quickActions} />
              </View>

              <View style={styles.section}>
                <Text
                  style={[theme.typography('titleMd'), styles.sectionTitle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  یادآوری‌های نزدیک
                </Text>
                <UpcomingRemindersList
                  reminders={data.upcomingReminders}
                  onSelect={(reminderId) => navigation.navigate('ReminderDetail', { reminderId })}
                />
              </View>

              <View style={styles.section}>
                <Text
                  style={[theme.typography('titleMd'), styles.sectionTitle]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  آخرین فعالیت‌ها
                </Text>
                <RecentActivityList activity={data.recentActivity} />
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
      gap: theme.spacing.space4
    },
    headerText: {
      flex: 1,
      minWidth: 0
    },
    greeting: {
      color: theme.colors.onSurface
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.component.statCardGrid.gap
    },
    section: {
      gap: theme.layout.componentSpacing
    },
    sectionTitle: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    }
  })
}
