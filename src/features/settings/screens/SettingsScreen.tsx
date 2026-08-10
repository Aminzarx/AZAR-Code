import React, { useEffect, useState } from 'react'
import { Clipboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card, ConfirmDialog, Icon } from '@shared/components'
import { getDatabase } from '@infrastructure/database/connection'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'

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
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!session) {
      return
    }
    getDatabase()
      .then((db) => new UserRepository(db).findById(session.userId))
      .then((user) => {
        if (!cancelled) {
          setPhoneNumber(user?.phoneNumber ?? null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [session])

  function handleCopyReferralCode(): void {
    if (!session?.referralCode) {
      return
    }
    Clipboard.setString(session.referralCode)
    setCopied(true)
  }

  function handleConfirmLogout(): void {
    setIsLogoutConfirmVisible(false)
    logout()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="تنظیمات">
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>تنظیمات</Text>

        <Card variant="detail" style={styles.card}>
          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>شماره موبایل</Text>
          <Text style={[theme.typography('titleMd'), styles.value]}>{phoneNumber ?? '-'}</Text>
        </Card>

        <Card variant="detail" style={styles.card}>
          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>کد معرف شما</Text>
          <View style={styles.codeRow}>
            <Text
              accessibilityLabel="کد معرف شما"
              style={[theme.typography('headlineLgMobile'), styles.code]}
            >
              {session?.referralCode}
            </Text>
            <Pressable
              onPress={handleCopyReferralCode}
              accessibilityRole="button"
              accessibilityLabel="کپی کد معرف"
              style={styles.copyButton}
              hitSlop={theme.spacing.space2}
            >
              <Icon name="copy" size="sm" color={theme.colors.primary} />
            </Pressable>
          </View>
          <Text style={[theme.typography('bodySm'), styles.hint]}>
            {copied
              ? 'کد معرف کپی شد.'
              : 'این کد را برای دعوت افراد جدید به آزار به اشتراک بگذارید.'}
          </Text>
        </Card>

        <Card variant="detail" style={styles.card}>
          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>وضعیت نشست</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={[theme.typography('titleMd'), styles.value]}>فعال</Text>
          </View>
        </Card>

        <Button
          label="خروج از حساب"
          variant="secondary"
          onPress={() => setIsLogoutConfirmVisible(true)}
        />
      </ScrollView>

      <ConfirmDialog
        visible={isLogoutConfirmVisible}
        title="خروج از حساب"
        description="آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟"
        confirmLabel="خروج"
        destructive
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutConfirmVisible(false)}
      />
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
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    card: {
      gap: theme.spacing.space2
    },
    cardLabel: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    value: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    code: {
      color: theme.colors.primary,
      letterSpacing: 4
    },
    copyButton: {
      minWidth: theme.touchTargetMinimum,
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    },
    hint: {
      color: theme.colors.onSurfaceVariant
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.success
    }
  })
}
