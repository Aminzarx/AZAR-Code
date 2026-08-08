import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Avatar, ErrorState, LoadingIndicator } from '@shared/components'
import { useDashboardData } from './hooks/useDashboardData'
import { StatCard } from './components/StatCard'
import { QuickActions, type QuickAction } from './components/QuickActions'
import { RecentActivityList } from './components/RecentActivityList'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>

export function DashboardScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session, logout } = useAuth()
  const { data, isLoading, error, refetch } = useDashboardData(session?.userId ?? '')

  const quickActions: QuickAction[] = [
    {
      id: 'add-property',
      label: 'افزودن پرونده ملکی',
      onPress: () => navigation.navigate('CreateProperty')
    },
    {
      id: 'add-applicant',
      label: 'افزودن متقاضی',
      onPress: () => navigation.navigate('CreateApplicant')
    },
    {
      id: 'deals',
      label: 'مشاهده پیگیری‌ها',
      onPress: () => navigation.navigate('DealList')
    },
    { id: 'logout', label: 'خروج از حساب', onPress: () => logout() }
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="داشبورد">
        <View style={styles.header}>
          <Avatar name={session?.referralCode ?? '?'} size="lg" />
          <View style={styles.headerText}>
            <Text style={[theme.typography('headlineLgMobile'), styles.greeting]}>خوش آمدید</Text>
            {session ? (
              <Text style={[theme.typography('bodySm'), styles.referralCode]}>
                کد معرف شما: {session.referralCode}
              </Text>
            ) : null}
          </View>
        </View>

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
                          : undefined
                    }
                  />
                ))}
              </View>

              <View style={styles.section}>
                <Text style={[theme.typography('titleMd'), styles.sectionTitle]}>اقدامات سریع</Text>
                <QuickActions actions={quickActions} />
              </View>

              <View style={styles.section}>
                <Text style={[theme.typography('titleMd'), styles.sectionTitle]}>
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
      padding: theme.spacing.space6,
      gap: theme.spacing.space8
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space4
    },
    headerText: {
      flex: 1
    },
    greeting: {
      color: theme.colors.onSurface
    },
    referralCode: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.space3
    },
    section: {
      gap: theme.spacing.space3
    },
    sectionTitle: {
      color: theme.colors.onSurface
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    }
  })
}
