import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card } from '@shared/components'

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>

/**
 * The referral code used to live on the very first screen after
 * registration (BasicProfileScreen, now removed) and in the Dashboard
 * header — visible every time the app opened. Moved here so it's still
 * always reachable, just not forced on the user by default.
 */
export function SettingsScreen(_props: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session, logout } = useAuth()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="تنظیمات">
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>تنظیمات</Text>

        <Card variant="detail" style={styles.card}>
          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>کد معرف شما</Text>
          <Text
            accessibilityLabel="کد معرف شما"
            style={[theme.typography('headlineLgMobile'), styles.code]}
          >
            {session?.referralCode}
          </Text>
          <Text style={[theme.typography('bodySm'), styles.hint]}>
            این کد را برای دعوت افراد جدید به آزار به اشتراک بگذارید.
          </Text>
        </Card>

        <Button label="خروج از حساب" variant="secondary" onPress={() => logout()} />
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
      gap: theme.spacing.space6
    },
    title: {
      color: theme.colors.primary
    },
    card: {
      gap: theme.spacing.space2
    },
    cardLabel: {
      color: theme.colors.onSurfaceVariant
    },
    code: {
      color: theme.colors.primary,
      letterSpacing: 4
    },
    hint: {
      color: theme.colors.onSurfaceVariant
    }
  })
}
