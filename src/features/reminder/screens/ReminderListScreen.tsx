import React from 'react'
import { SectionList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import { useReminders } from '../hooks/useReminders'
import { useReminderService } from '../hooks/useReminderService'
import { useReminderContexts } from '../hooks/useReminderContexts'
import { ReminderListItem } from '../components/ReminderListItem'
import { ReminderAttentionHeader } from '../components/ReminderAttentionHeader'
import { countReminderAttention, groupRemindersByTime } from '../utils/reminderGrouping'
import type { Reminder } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'ReminderList'>

export function ReminderListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { reminders, isLoading, error, refetch } = useReminders(userId)
  const service = useReminderService()
  const { resolve: resolveContext } = useReminderContexts(userId)

  async function handleToggleDone(id: string, isDone: boolean): Promise<void> {
    if (!service) {
      return
    }
    await service.setDone(id, !isDone, userId)
    refetch()
  }

  const attention = countReminderAttention(reminders ?? [])
  const sections = groupRemindersByTime(reminders ?? []).map((group) => ({
    title: group.label,
    data: group.reminders
  }))

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری یادآوری‌ها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : reminders && reminders.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز یادآوری‌ای ثبت نشده"
              description="یادآوری‌های خود را از داشبورد یا صفحه پیگیری اضافه کنید."
              actionLabel="افزودن یادآوری"
              onAction={() => navigation.navigate('CreateReminder', undefined)}
            />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={
              <ReminderAttentionHeader
                overdueCount={attention.overdueCount}
                dueTodayCount={attention.dueTodayCount}
              />
            }
            renderSectionHeader={({ section }) => (
              <Text style={[theme.typography('titleSm'), styles.sectionHeader]}>
                {section.title}
              </Text>
            )}
            renderItem={({ item }: { item: Reminder }) => (
              <ReminderListItem
                reminder={item}
                context={resolveContext(item)}
                onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}
                onToggleDone={() => handleToggleDone(item.id, item.isDone)}
              />
            )}
          />
        )}
      </View>
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
      flex: 1,
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    list: {
      gap: theme.spacing.space3
    },
    sectionHeader: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginTop: theme.layout.sectionSpacing,
      marginBottom: theme.spacing.space2
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
