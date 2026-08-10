import React, { useEffect, useState } from 'react'
import { Clipboard, Pressable, Share, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card, ConfirmDialog, Icon, PasswordPromptDialog } from '@shared/components'
import { getDatabase } from '@infrastructure/database/connection'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import { createBackupFile } from '@infrastructure/backup/BackupService'

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
  const [isBackupDialogVisible, setIsBackupDialogVisible] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)

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

  async function handleCreateBackup(password: string): Promise<void> {
    setBackupError(null)
    setIsCreatingBackup(true)
    try {
      const db = await getDatabase()
      const path = await createBackupFile(db, password)
      setIsBackupDialogVisible(false)
      // Writing the file only puts it in the app's private cache
      // (BackupService.ts) — the OS share sheet is what actually lets the
      // user pick a real destination (Drive, Files, another app) for it.
      await Share.share({ url: `file://${path}`, title: 'نسخه پشتیبان آزار' })
    } catch {
      setBackupError('تهیه نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="تنظیمات">
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>تنظیمات</Text>

        {/* design-system.md §0.2's card-stack ban — one Card, sectioned by
            hairlines, instead of a separate Card per field (the pattern
            already established in ContractDetailScreen). */}
        <Card variant="detail">
          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>شماره موبایل</Text>
          <Text style={[theme.typography('titleMd'), styles.value]}>{phoneNumber ?? '-'}</Text>

          <View style={styles.divider} />

          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>کد معرف شما</Text>
          <Text style={[theme.typography('bodySm'), styles.hint]}>
            {copied
              ? 'کد معرف کپی شد.'
              : 'این کد را برای دعوت افراد جدید به آزار به اشتراک بگذارید.'}
          </Text>

          {session?.referralCode ? (
            <View style={styles.qrSection}>
              <View style={styles.qrFrame}>
                <QRCode
                  value={session.referralCode}
                  size={140}
                  color={theme.colors.primary}
                  backgroundColor={theme.colors.surfaceContainerLowest}
                />
              </View>
              <View style={styles.codeRow}>
                <Text
                  accessibilityLabel="کد معرف شما"
                  style={[theme.typography('titleMd'), styles.qrCode]}
                >
                  {session.referralCode}
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
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>وضعیت نشست</Text>
            <View style={styles.statusValue}>
              <View style={styles.statusDot} />
              <Text style={[theme.typography('titleMd'), styles.statusText]}>فعال</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>پشتیبان‌گیری</Text>
          <Text style={[theme.typography('bodySm'), styles.hint]}>
            یک نسخه پشتیبان رمزگذاری‌شده از اطلاعات این دستگاه تهیه کنید تا در جای امنی نگه‌داری یا
            به دستگاه دیگری منتقل کنید.
          </Text>
          <Button
            label="تهیه نسخه پشتیبان"
            variant="secondary"
            onPress={() => setIsBackupDialogVisible(true)}
            style={styles.backupButton}
          />
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

      <PasswordPromptDialog
        visible={isBackupDialogVisible}
        title="تهیه نسخه پشتیبان"
        description="یک رمز عبور برای این نسخه پشتیبان انتخاب کنید (حداقل ۸ نویسه). این رمز برای بازیابی اطلاعات لازم است — آن را جایی امن یادداشت کنید."
        confirmLabel="تهیه و اشتراک‌گذاری"
        isSubmitting={isCreatingBackup}
        errorMessage={backupError ?? undefined}
        onConfirm={handleCreateBackup}
        onCancel={() => {
          setBackupError(null)
          setIsBackupDialogVisible(false)
        }}
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
    cardLabel: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    value: {
      color: theme.colors.onSurface,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: theme.spacing.space4
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    copyButton: {
      minWidth: theme.touchTargetMinimum,
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    },
    hint: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    qrSection: {
      alignItems: 'center',
      marginTop: theme.spacing.space4,
      gap: theme.spacing.space2
    },
    qrFrame: {
      padding: theme.spacing.space3,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    qrCode: {
      color: theme.colors.primary,
      letterSpacing: 2
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    statusValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    statusText: {
      color: theme.colors.onSurface
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.success
    },
    backupButton: {
      marginTop: theme.spacing.space3
    }
  })
}
