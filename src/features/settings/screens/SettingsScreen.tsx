import React, { useEffect, useState } from 'react'
import { Clipboard, Pressable, Share, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  Card,
  ConfirmDialog,
  Icon,
  OtpPromptDialog,
  PasswordPromptDialog,
  TextInput
} from '@shared/components'
import { getDatabase } from '@infrastructure/database/connection'
import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
import {
  SessionRepository,
  type SessionRecord
} from '@infrastructure/database/repositories/SessionRepository'
import { createBackupFile } from '@infrastructure/backup/BackupService'
import { useDisplayName } from '@shared/hooks/useDisplayName'
import { formatDateTime } from '@shared/utils/formatDate'
import { ValidationFailureError } from '@core/auth/errors'

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>

type DeleteAccountStep = 'closed' | 'confirm' | 'otp'

/**
 * The referral code used to live on the very first screen after
 * registration (BasicProfileScreen, now removed) and in the Dashboard
 * header — visible every time the app opened. Moved here so it's still
 * always reachable, just not forced on the user by default.
 */
export function SettingsScreen(_props: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session, logout, sendOtp, verifyOtp, deleteAccount } = useAuth()
  const { displayName, setDisplayName } = useDisplayName()
  const [nameInput, setNameInput] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [sessionRecord, setSessionRecord] = useState<SessionRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [isMenuVisible, setIsMenuVisible] = useState(false)
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false)
  const [isBackupDialogVisible, setIsBackupDialogVisible] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<DeleteAccountStep>('closed')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!session) {
      return
    }
    getDatabase().then((db) => {
      new UserRepository(db).findById(session.userId).then((user) => {
        if (!cancelled) {
          setPhoneNumber(user?.phoneNumber ?? null)
        }
      })
      // Real session state (not a hardcoded "فعال") — the local sessions
      // table already tracks creation/revocation; RootNavigator wouldn't
      // have routed here at all if this session were revoked, but reading
      // the actual record (rather than assuming) is what makes this real.
      new SessionRepository(db).findById(session.sessionId).then((record) => {
        if (!cancelled) {
          setSessionRecord(record)
        }
      })
    })
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (displayName !== null) {
      setNameInput(displayName)
    }
  }, [displayName])

  function handleNameBlur(): void {
    setIsEditingName(false)
    if (nameInput.trim() !== (displayName ?? '')) {
      setDisplayName(nameInput)
    }
  }

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

  async function handleStartAccountDeletion(): Promise<void> {
    if (!phoneNumber) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      // A fresh code, not the one used to log in earlier this session —
      // deleting an account gets its own re-confirmation.
      await sendOtp(phoneNumber)
      setDeleteStep('otp')
    } catch {
      setDeleteStep('closed')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleConfirmAccountDeletion(code: string): Promise<void> {
    if (!phoneNumber) {
      return
    }
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await verifyOtp(phoneNumber, code)
      await deleteAccount(phoneNumber)
      setDeleteStep('closed')
      // No explicit navigation: deleteAccount() already clears the
      // session, and RootNavigator swaps to the Auth stack on its own
      // the same way logout() does.
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof ValidationFailureError
          ? caughtError.message
          : 'حذف حساب با مشکل مواجه شد. دوباره تلاش کنید.'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="تنظیمات">
        <View style={styles.header}>
          <Text style={[theme.typography('headlineLgMobile'), styles.title]}>تنظیمات</Text>
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="گزینه‌های حساب"
              onPress={() => setIsMenuVisible((current) => !current)}
              style={styles.menuButton}
              hitSlop={theme.spacing.space2}
            >
              <Icon name="moreVertical" size="sm" color={theme.colors.onSurface} />
            </Pressable>
            {isMenuVisible ? (
              <>
                <Pressable
                  style={styles.menuBackdrop}
                  onPress={() => setIsMenuVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="بستن منو"
                />
                <View style={styles.menu}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="خروج از حساب"
                    onPress={() => {
                      setIsMenuVisible(false)
                      setIsLogoutConfirmVisible(true)
                    }}
                    style={styles.menuItem}
                  >
                    <Text style={[theme.typography('bodyMd'), styles.menuItemLabel]}>
                      خروج از حساب
                    </Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="حذف حساب"
                    onPress={() => {
                      setIsMenuVisible(false)
                      setDeleteError(null)
                      setDeleteStep('confirm')
                    }}
                    style={styles.menuItem}
                  >
                    <Text style={[theme.typography('bodyMd'), styles.menuItemLabelDestructive]}>
                      حذف حساب
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* design-system.md §0.2's card-stack ban — one Card, sectioned by
            hairlines, instead of a separate Card per field (the pattern
            already established in ContractDetailScreen). */}
        <Card variant="detail">
          <View style={styles.nameRow}>
            <View style={styles.nameLabelGroup}>
              <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>نام</Text>
              {isEditingName ? (
                <TextInput
                  label="نام"
                  value={nameInput}
                  onChangeText={setNameInput}
                  onBlur={handleNameBlur}
                  placeholder="نام خود را وارد کنید"
                  autoFocus
                />
              ) : (
                <Text style={[theme.typography('titleMd'), styles.value]}>
                  {displayName || 'ثبت نشده'}
                </Text>
              )}
            </View>
            {!isEditingName ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ویرایش نام"
                onPress={() => setIsEditingName(true)}
                hitSlop={theme.spacing.space2}
              >
                <Text style={[theme.typography('labelMd'), styles.editLabel]}>ویرایش</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.divider} />

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
              <View
                style={[
                  styles.statusDot,
                  !sessionRecord || sessionRecord.revokedAt ? styles.statusDotInactive : null
                ]}
              />
              <Text style={[theme.typography('titleMd'), styles.statusText]}>
                {sessionRecord && !sessionRecord.revokedAt
                  ? `فعال از ${formatDateTime(sessionRecord.createdAt)}`
                  : 'نامشخص'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={[theme.typography('bodyMd'), styles.cardLabel]}>پشتیبان‌گیری</Text>
          <Text style={[theme.typography('bodySm'), styles.hint]}>
            یک نسخه پشتیبان رمزگذاری‌شده از اطلاعات این دستگاه تهیه کنید تا در جای امنی نگه‌داری یا
            به دستگاه دیگری منتقل کنید.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تهیه نسخه پشتیبان"
            onPress={() => setIsBackupDialogVisible(true)}
            style={styles.backupButton}
          >
            <Text style={[theme.typography('labelMd'), styles.backupButtonLabel]}>
              تهیه نسخه پشتیبان
            </Text>
          </Pressable>
        </Card>
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

      <ConfirmDialog
        visible={deleteStep === 'confirm'}
        title="حذف حساب کاربری"
        description="این عملیات برگشت‌ناپذیر است. یک کد تأیید به شماره موبایل شما پیامک می‌شود؛ با وارد کردن آن، حساب برای همیشه حذف خواهد شد."
        confirmLabel="ارسال کد"
        destructive
        isConfirming={isDeleting}
        onConfirm={handleStartAccountDeletion}
        onCancel={() => setDeleteStep('closed')}
      />

      <OtpPromptDialog
        visible={deleteStep === 'otp'}
        title="تأیید حذف حساب"
        description={`کد ارسال‌شده به ${phoneNumber ?? 'شماره شما'} را وارد کنید تا حساب برای همیشه حذف شود.`}
        confirmLabel="حذف قطعی حساب"
        isSubmitting={isDeleting}
        errorMessage={deleteError ?? undefined}
        onConfirm={handleConfirmAccountDeletion}
        onCancel={() => setDeleteStep('closed')}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    title: {
      color: theme.colors.primary
    },
    menuButton: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    },
    menuBackdrop: {
      position: 'absolute',
      top: -1000,
      bottom: -1000,
      start: -1000,
      end: -1000
    },
    menu: {
      position: 'absolute',
      top: theme.touchTargetMinimum,
      start: 0,
      minWidth: 160,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden',
      ...theme.elevation.level2
    },
    menuItem: {
      minHeight: theme.touchTargetMinimum,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.space4
    },
    menuItemLabel: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    menuItemLabelDestructive: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    menuDivider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.space3
    },
    nameLabelGroup: {
      flex: 1,
      gap: theme.spacing.space1
    },
    editLabel: {
      color: theme.colors.onSurfaceVariant
    },
    cardLabel: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    value: {
      color: theme.colors.onSurface,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
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
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
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
    statusDotInactive: {
      backgroundColor: theme.colors.outline
    },
    backupButton: {
      marginTop: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.component.textField.radius,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    backupButtonLabel: {
      color: theme.colors.primary
    }
  })
}
