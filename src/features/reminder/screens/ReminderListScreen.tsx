import React, { useEffect } from 'react'
import { SectionList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  ErrorState,
  FloatingActionButton,
  LoadingIndicator,
  ScreenHeaderBar
} from '@shared/components'
import { useUndoableDelete } from '@shared/hooks/useUndoableDelete'
import { useReminders } from '../hooks/useReminders'
import { useReminderService } from '../hooks/useReminderService'
import { useReminderContexts } from '../hooks/useReminderContexts'
import { ReminderListItem } from '../components/ReminderListItem'
import { ReminderAttentionHeader } from '../components/ReminderAttentionHeader'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { askNotificationsOnce } from '@infrastructure/push/announcementPush'
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
  // Amin #5370: «یادآوری‌ها» became «اعلان‌ها»: KSS announcements on top, then the reminders
  const { announcements, dismiss, markSeen, open } = useAnnouncements()
  // Amin #6214: they sit at the top of this screen, so once they are here they have been seen (the bell's number drops)
  const unseenIds = announcements.filter((announcement) => announcement.seen === false).map((announcement) => announcement.id).join(',')
  useEffect(() => {
    if (unseenIds) markSeen(unseenIds.split(','))
  }, [unseenIds, markSeen])
  // the phone notifications for «روی گوشی هم» announcements: asked once, here rather than at launch
  useEffect(() => {
    askNotificationsOnce().catch(() => undefined)
  }, [])
  const announcementCards =
    announcements.length > 0 ? (
      <View style={styles.announcements}>
        {announcements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            onDismiss={() => dismiss(announcement.id)}
            onOpen={() => open(announcement.id)}
          />
        ))}
      </View>
    ) : null
  const { resolve: resolveContext } = useReminderContexts(userId)
  const del = useUndoableDelete({
    noun: 'یادآوری',
    remove: async (id) => {
      if (!service) throw new Error('not ready')
      await service.deleteReminder(id)
    },
    onDeleted: refetch
  })

  async function handleToggleDone(id: string, isDone: boolean): Promise<void> {
    if (!service) {
      return
    }
    await service.setDone(id, !isDone, userId)
    refetch()
  }

  const visibleReminders = (reminders ?? []).filter((reminder) => !del.hidden.has(reminder.id))
  const attention = countReminderAttention(visibleReminders)
  const groups = groupRemindersByTime(visibleReminders)
  const sections = groups.map((group) => ({
    title: group.label,
    data: group.reminders
  }))
  // Amin #5608: with nothing for today only a grey line says so (no big empty-state block)
  const noneToday = !groups.some((group) => group.key === 'today') ? (
    <Text style={[theme.typography('bodyMd'), styles.noneToday]}>امروز یادآوری‌ای ندارید</Text>
  ) : null

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeaderBar onBack={() => navigation.goBack()} title="اعلان‌ها" section="reminder" />
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
          <View style={styles.emptyList}>
            {announcementCards}
            {noneToday}
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={
              <>
                {announcementCards}
                <ReminderAttentionHeader
                  overdueCount={attention.overdueCount}
                  dueTodayCount={attention.dueTodayCount}
                />
                {noneToday}
              </>
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
                onLongPress={() => del.onLongPress(item.id, item.title)}
                onToggleDone={() => handleToggleDone(item.id, item.isDone)}
              />
            )}
          />
        )}

        {reminders ? (
          <FloatingActionButton
            accessibilityLabel="افزودن یادآوری"
            onPress={() => navigation.navigate('CreateReminder', undefined)}
          />
        ) : null}
      </View>
      {del.ui}
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
    announcements: {
      alignSelf: 'stretch',
      gap: theme.spacing.space3,
      marginBottom: theme.spacing.space4
    },
    sectionHeader: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginTop: theme.layout.sectionSpacing,
      marginBottom: theme.spacing.space2
    },
    emptyList: {
      alignSelf: 'stretch'
    },
    noneToday: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginTop: theme.spacing.space2
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
