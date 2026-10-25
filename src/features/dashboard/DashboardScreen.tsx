import React from 'react'
import { useLicence } from '@shared/licence/LicenceContext'
import { LicenceBanner } from '@features/licence/LicenceBanner'
import { OfflineFilesNotice } from '@features/auth/components/OfflineFilesNotice'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Avatar, ErrorState, LoadingIndicator, LogoPlaceholder } from '@shared/components'
import { useProfile } from '@features/settings/hooks/useProfile'
import { photoUri } from '@infrastructure/images/profilePhoto'
import { useDisplayName } from '@shared/hooks/useDisplayName'
import { getTimeBasedGreeting } from '@shared/utils/greeting'
import { useDashboardData } from './hooks/useDashboardData'
import {
  FirstStepsCard,
  FollowUpList,
  HomeAddButtons,
  MatchBanner,
  RoundIconButton,
  SectionHeader,
  SummaryTiles
} from './components/HomeSections'
import type { DashboardStat } from './types'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>

/**
 * Home, v1.3.0 (design batch 2, Amin's approved mockups): greeting and
 * reminders bell, the two add buttons, the matching banner, today's
 * follow-ups with a call button, and the four-number summary. A new
 * account sees the first-steps checklist instead of the banner.
 */
export function DashboardScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const { data, isLoading, error, refetch } = useDashboardData(session?.userId ?? '')
  const { displayName } = useDisplayName()
  const { profile } = useProfile()
  const ownPhoto = photoUri(profile.photoPath)
  // Amin #4906: after the licence ends Home keeps the follow-ups and the summary; adding and matching wait
  const { canEdit } = useLicence()

  const count = (id: DashboardStat['id']) => data?.stats.find((stat) => stat.id === id)?.value ?? 0
  const hasProperty = count('properties') > 0
  const hasApplicant = count('applicants') > 0
  const isNewAccount = Boolean(data) && !hasProperty && !hasApplicant
  const greeting = isNewAccount ? 'خوش آمدید' : getTimeBasedGreeting()

  const addProperty = () => navigateAcrossTabs(navigation, 'CreateProperty', undefined)
  const addApplicant = () => navigateAcrossTabs(navigation, 'CreateApplicant', undefined)

  function openStat(id: DashboardStat['id']): void {
    switch (id) {
      case 'properties':
        navigateAcrossTabs(navigation, 'PropertyList', undefined)
        break
      case 'applicants':
        navigateAcrossTabs(navigation, 'ApplicantList', undefined)
        break
      case 'deals':
        navigateAcrossTabs(navigation, 'DealList', undefined)
        break
      case 'contracts':
        navigateAcrossTabs(navigation, 'ContractList', undefined)
        break
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="خانه">
        <View style={styles.header}>
          <Pressable
            onPress={() => navigateAcrossTabs(navigation, 'Settings', undefined)}
            accessibilityRole="button"
            accessibilityLabel="مشاهده پروفایل و تنظیمات"
            style={styles.headerLeading}
          >
            {/* Amin #5107: the profile photo, or the faded EYVAN logo until there is one */}
            {ownPhoto ? (
              <Avatar name={displayName ?? 'کاربر ایوان'} imageUri={ownPhoto} size="lg" />
            ) : (
              <LogoPlaceholder style={styles.avatar} logoShare={0.6} />
            )}
            <View style={styles.headerText}>
              {/* #5122: never cut — a long name makes the line smaller (down to 70%), then «…» at its end */}
              <Text
                style={[theme.typography('headlineLgMobile'), styles.greeting]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {greeting}
                {displayName ? `، ${displayName}` : ''}
              </Text>
              {isNewAccount ? (
                <Text style={[theme.typography('bodySm'), styles.subGreeting]}>
                  سه قدم تا اولین تطبیق
                </Text>
              ) : null}
            </View>
          </Pressable>
          <RoundIconButton
            icon="bell"
            accessibilityLabel="یادآوری‌ها"
            showDot={data?.hasOverdue}
            onPress={() => navigation.navigate('ReminderList', undefined)}
          />
        </View>

        <OfflineFilesNotice />
        <LicenceBanner onOpen={() => navigateAcrossTabs(navigation, 'Settings', undefined)} />

        {isLoading && !data ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری خانه با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : data ? (
          <>
            {canEdit && (!hasProperty || !hasApplicant) ? (
              <FirstStepsCard
                hasProperty={hasProperty}
                hasApplicant={hasApplicant}
                onAddProperty={addProperty}
                onAddApplicant={addApplicant}
              />
            ) : null}

            {canEdit && data.matches.matchCount > 0 ? (
              <MatchBanner
                matches={data.matches}
                onPress={() => navigateAcrossTabs(navigation, 'Matching', undefined)}
              />
            ) : null}

            {!isNewAccount ? (
              <>
                <View style={styles.section}>
                  <SectionHeader
                    title="پیگیری‌های امروز"
                    actionLabel="همه"
                    onAction={() => navigation.navigate('ReminderList', undefined)}
                  />
                  <FollowUpList
                    followUps={data.followUps}
                    onSelect={(reminderId) => navigation.navigate('ReminderDetail', { reminderId })}
                  />
                </View>

                <View style={styles.section}>
                  <SectionHeader title="خلاصه" />
                  <SummaryTiles stats={data.stats} onSelect={openStat} />
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      {/* Amin #5297: «فایل ملکی» and «متقاضی» stay put just above the tab bar; the page scrolls behind them */}
      {canEdit && data ? (
        <View style={styles.pinnedAdd}>
          <HomeAddButtons onAddProperty={addProperty} onAddApplicant={addApplicant} />
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    pinnedAdd: {
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingVertical: theme.spacing.space3,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant
    },
    content: {
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingTop: theme.layout.screenPaddingX,
      paddingBottom: theme.layout.screenPaddingBottom,
      gap: theme.spacing.space5
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space4
    },
    headerLeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      flexShrink: 1,
      minWidth: 0
    },
    headerText: {
      flexShrink: 1,
      minWidth: 0
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    greeting: {
      color: theme.colors.onSurface,
      alignSelf: start
    },
    subGreeting: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: start
    },
    section: {
      gap: theme.layout.componentSpacing
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space12
    }
  })
}
