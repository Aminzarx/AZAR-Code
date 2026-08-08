import React from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import { useReminders } from '../hooks/useReminders'
import { useReminderService } from '../hooks/useReminderService'
import { ReminderListItem } from '../components/ReminderListItem'

type Props = NativeStackScreenProps<MainStackParamList, 'ReminderList'>

export function ReminderListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { reminders, isLoading, error, refetch } = useReminders(userId)
  const service = useReminderService()

  async function handleToggleDone(id: string, isDone: boolean): Promise<void> {
    if (!service) {
      return
    }
    await service.setDone(id, !isDone)
    refetch()
  }

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
            />
          </View>
        ) : (
          <FlatList
            data={reminders ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ReminderListItem
                reminder={item}
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
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
