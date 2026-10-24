import React, { useEffect, useState } from 'react'
import { Clipboard, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  Button,
  ConfirmDialog,
  Icon,
  InfoDialog,
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
import {
  createBackupFile,
  restoreBackupFile,
  RestoreSchemaTooNewError
} from '@infrastructure/backup/BackupService'
import {
  BackupAuthenticationError,
  BackupTooNewError,
  BackupTooOldError,
  BackupFormatError
} from '@infrastructure/backup/backupFile'
import { SnapshotFormatError } from '@infrastructure/backup/databaseSnapshot'
import {
  pickBackupFileBytes,
  saveBackupFileToDevice,
  shareBackupFile
} from '@infrastructure/backup/backupFileTransfer'
import { useDisplayName } from '@shared/hooks/useDisplayName'
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus'
import { formatDateTime } from '@shared/utils/formatDate'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { APP_VERSION } from '@shared/appVersion'
import { InviteSmsDialog } from '../components/InviteSmsDialog'
import { SettingsRow } from '../components/SettingsRow'

const APP_DOWNLOAD_URL = 'https://api.zarandix.ir/app/'
import { ValidationFailureError } from '@core/auth/errors'

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>

/**
 * migration-strategy.md's restore checklist requires the *specific,
 * most-actionable* reason to reach the user, not a generic failure —
 * wrong password, corrupted file, and unsupported version are genuinely
 * different situations to be in.
 */
function importErrorMessage(error: Error): string {
  if (error instanceof BackupAuthenticationError) {
    return 'رمز عبور اشتباه است یا فایل نسخه پشتیبان خراب شده است.'
  }
  if (error instanceof BackupTooNewError || error instanceof RestoreSchemaTooNewError) {
    return 'این نسخه پشتیبان توسط نسخه جدیدتری از اپلیکیشن ساخته شده و با این نسخه سازگار نیست.'
  }
  if (error instanceof BackupTooOldError) {
    return 'این نسخه پشتیبان مربوط به نسخه‌ای بسیار قدیمی از اپلیکیشن است و قابل بازیابی نیست.'
  }
  if (error instanceof BackupFormatError || error instanceof SnapshotFormatError) {
    return 'این فایل یک نسخه پشتیبان معتبر ایوان نیست.'
  }
  return 'بازیابی نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.'
}

type DeleteAccountStep = 'closed' | 'confirm' | 'otp'
type ImportStep = 'closed' | 'password' | 'success'

/**
 * The referral code used to live on the very first screen after
 * registration (BasicProfileScreen, now removed) and in the Dashboard
 * header — visible every time the app opened. Moved here so it's still
 * always reachable, just not forced on the user by default.
 */
export function SettingsScreen(props: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session, logout, sendOtp, verifyOtp, deleteAccount } = useAuth()
  const { displayName, setDisplayName } = useDisplayName()
  const isOnline = useNetworkStatus()
  const [nameInput, setNameInput] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [sessionRecord, setSessionRecord] = useState<SessionRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [isInviteVisible, setIsInviteVisible] = useState(false)
  const [isQrVisible, setIsQrVisible] = useState(false)
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false)
  const [isBackupDialogVisible, setIsBackupDialogVisible] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [pendingBackup, setPendingBackup] = useState<{ path: string; fileName: string } | null>(
    null
  )
  const [isSavingBackup, setIsSavingBackup] = useState(false)
  const [isSharingBackup, setIsSharingBackup] = useState(false)
  const [backupActionError, setBackupActionError] = useState<string | null>(null)
  const [isImportWarningVisible, setIsImportWarningVisible] = useState(false)
  const [isPickingImportFile, setIsPickingImportFile] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>('closed')
  const [pendingImportBytes, setPendingImportBytes] = useState<Uint8Array | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
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

  function handleShareReferralCode(): void {
    if (!session?.referralCode) {
      return
    }
    Share.share({
      message: `ایوان، دفتر کار همراه مشاوران املاک. برنامه را از ${APP_DOWNLOAD_URL} بگیرید و هنگام ثبت‌نام این کد معرف را بزنید: ${session.referralCode}`
    }).catch(() => undefined)
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
      setBackupActionError(null)
      // The file only lands in the app's private cache at this point —
      // the two buttons below let the user actually choose where it ends
      // up (a real folder via SAF, or another app like Telegram).
      setPendingBackup({ path, fileName: path.split('/').pop() ?? 'azar-backup.azarbackup' })
    } catch {
      setBackupError('تهیه نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  async function handleSaveBackupToDevice(): Promise<void> {
    if (!pendingBackup) {
      return
    }
    setBackupActionError(null)
    setIsSavingBackup(true)
    try {
      const saved = await saveBackupFileToDevice(pendingBackup.path, pendingBackup.fileName)
      if (saved) {
        setPendingBackup(null)
      }
    } catch {
      setBackupActionError('ذخیره نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsSavingBackup(false)
    }
  }

  async function handleShareBackup(): Promise<void> {
    if (!pendingBackup) {
      return
    }
    setBackupActionError(null)
    setIsSharingBackup(true)
    try {
      const shared = await shareBackupFile(pendingBackup.path, pendingBackup.fileName)
      if (shared) {
        setPendingBackup(null)
      }
    } catch {
      setBackupActionError('اشتراک‌گذاری نسخه پشتیبان با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsSharingBackup(false)
    }
  }

  async function handleConfirmImportWarning(): Promise<void> {
    setIsImportWarningVisible(false)
    setIsPickingImportFile(true)
    try {
      const bytes = await pickBackupFileBytes()
      if (bytes) {
        setPendingImportBytes(bytes)
        setImportError(null)
        setImportStep('password')
      }
    } catch {
      setImportError('باز کردن فایل نسخه پشتیبان با مشکل مواجه شد.')
      setImportStep('password')
    } finally {
      setIsPickingImportFile(false)
    }
  }

  async function handleConfirmImportPassword(password: string): Promise<void> {
    if (!pendingImportBytes) {
      return
    }
    setImportError(null)
    setIsImporting(true)
    try {
      const db = await getDatabase()
      await restoreBackupFile(db, password, pendingImportBytes)
      setPendingImportBytes(null)
      // The live database was just fully replaced out from under the
      // current session row and every screen's in-memory state — signing
      // out (handleFinishRestore) forces every screen to re-mount and
      // re-read from the database once the user logs back in, instead of
      // continuing to show whatever it happened to have in memory before
      // the restore.
      setImportStep('success')
    } catch (caughtError) {
      setImportError(
        caughtError instanceof Error
          ? importErrorMessage(caughtError)
          : 'بازیابی نسخه پشتیبان با مشکل مواجه شد.'
      )
    } finally {
      setIsImporting(false)
    }
  }

  async function handleFinishRestore(): Promise<void> {
    setImportStep('closed')
    await logout()
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="من">
        {/* v1.4.0 (approved «من» design): who you are, the invite card, then one list */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={[theme.typography('titleMd'), styles.avatarText]}>
              {(displayName || 'ا').trim().charAt(0)}
            </Text>
          </View>
          <View style={styles.profileText}>
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
              <Text style={[theme.typography('titleMd'), styles.value]} numberOfLines={1}>
                {displayName || 'نام ثبت نشده'}
              </Text>
            )}
            <Text style={[theme.typography('bodySm'), styles.phone]}>
              {phoneNumber ? toPersianDigits(formatIranPhoneNumberForDisplay(phoneNumber)) : '-'}
            </Text>
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

        {session?.referralCode ? (
          <View style={styles.inviteCard}>
            <Text style={[theme.typography('titleSm'), styles.inviteTitle]}>همکارانتان را دعوت کنید</Text>
            <Text style={[theme.typography('bodySm'), styles.inviteLead]}>
              {copied ? 'کد معرف کپی شد.' : 'کد شما برای ثبت‌نام همکاران'}
            </Text>
            <View style={styles.inviteRow}>
              <View style={styles.inviteCode}>
                <Text accessibilityLabel="کد معرف شما" style={[theme.typography('titleMd'), styles.inviteCodeText]}>
                  {session.referralCode}
                </Text>
                <Pressable
                  onPress={handleCopyReferralCode}
                  accessibilityRole="button"
                  accessibilityLabel="کپی کد معرف"
                  hitSlop={theme.spacing.space2}
                >
                  <Icon name="copy" size="sm" color={theme.colors.onPrimary} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="اشتراک کد معرف"
                onPress={handleShareReferralCode}
                style={styles.inviteShare}
              >
                <Text style={[theme.typography('labelMd'), styles.inviteShareText]}>اشتراک</Text>
              </Pressable>
            </View>
            <View style={styles.inviteActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="دعوت با پیامک"
                onPress={() => setIsInviteVisible(true)}
                style={[styles.inviteAction, styles.inviteActionWide]}
              >
                <Icon name="sms" size="sm" color={theme.colors.onPrimary} />
                <Text style={[theme.typography('labelMd'), styles.inviteActionText]}>دعوت با پیامک</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isQrVisible ? 'بستن بارکد' : 'نمایش بارکد'}
                onPress={() => setIsQrVisible((current) => !current)}
                style={styles.inviteAction}
              >
                <Icon name="qr" size="sm" color={theme.colors.onPrimary} />
              </Pressable>
            </View>
            {isQrVisible ? (
              <View style={styles.qrFrame}>
                <QRCode value={session.referralCode} size={140} color={theme.colors.primary} backgroundColor="#FFFFFF" />
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.list}>
          <SettingsRow
            icon="cloud"
            label="تهیه نسخه پشتیبان"
            value="ذخیرهٔ امن اطلاعات"
            onPress={() => setIsBackupDialogVisible(true)}
          />
          <SettingsRow
            icon="download"
            label="بازیابی از نسخه پشتیبان"
            onPress={() => {
              setImportError(null)
              setIsImportWarningVisible(true)
            }}
          />
          <SettingsRow
            icon="bell"
            label="یادآوری‌ها و اعلان‌ها"
            onPress={() => props.navigation.navigate('ReminderList')}
          />
          <SettingsRow
            icon="mobile"
            label="این گوشی"
            value={
              sessionRecord && !sessionRecord.revokedAt
                ? `فعال از ${formatDateTime(sessionRecord.createdAt)}`
                : 'نامشخص'
            }
            badge={isOnline === null ? undefined : isOnline ? 'آنلاین' : 'آفلاین'}
          />
          <SettingsRow
            icon="help"
            label="راهنما و پشتیبانی"
            onPress={() => {
              Linking.openURL(COMPANY_SITE_URL).catch(() => undefined)
            }}
          />
          <SettingsRow
            icon="logout"
            label="خروج از حساب"
            destructive
            onPress={() => setIsLogoutConfirmVisible(true)}
            last
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="حذف حساب"
          onPress={() => {
            setDeleteError(null)
            setDeleteStep('confirm')
          }}
          style={styles.deleteAccount}
          hitSlop={theme.spacing.space2}
        >
          <Text style={[theme.typography('labelSm'), styles.deleteAccountText]}>حذف حساب کاربری</Text>
        </Pressable>

        {/* v1.4.0 (Amin #4324): whose app this is, linked to the company site */}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="ایوان، برنامه‌ای از خیام صنعت شریف؛ ورود به وبسایت kssx.ir"
          onPress={() => {
            Linking.openURL(COMPANY_SITE_URL).catch(() => undefined)
          }}
          style={styles.madeBy}
        >
          <Text style={[theme.typography('bodySm'), styles.madeByText]}>ایوان، برنامه‌ای از خیام صنعت شریف</Text>
          <Text style={[theme.typography('labelMd'), styles.madeByLink]}>kssx.ir</Text>
        </Pressable>
        <Text style={[theme.typography('labelSm'), styles.version]}>
          {`ایوان · نسخهٔ ${toPersianDigits(APP_VERSION)}`}
        </Text>
      </ScrollView>

      <InviteSmsDialog
        visible={isInviteVisible}
        onClose={() => setIsInviteVisible(false)}
        senderName={displayName}
      />

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
        description="یک رمز عبور برای این نسخه پشتیبان انتخاب کنید (حداقل ۸ نویسه). این رمز برای بازیابی اطلاعات لازم است، پس آن را جایی امن یادداشت کنید."
        confirmLabel="ایجاد نسخه پشتیبان"
        isSubmitting={isCreatingBackup}
        errorMessage={backupError ?? undefined}
        onConfirm={handleCreateBackup}
        onCancel={() => {
          setBackupError(null)
          setIsBackupDialogVisible(false)
        }}
      />

      {/* Deliberately not a Modal-based dialog like the others — this one
          offers a choice between two real native pickers (SAF "save as"
          and the OS share sheet) that need to launch on top of it, so it
          stays a plain overlay rather than another `Modal`-in-`Modal`. */}
      {pendingBackup ? (
        <View style={styles.backupReadyBackdrop}>
          <View style={styles.backupReadyCard}>
            <Text style={[theme.typography('titleMd'), styles.dialogTitle]}>
              نسخه پشتیبان آماده است
            </Text>
            <Text style={[theme.typography('bodyMd'), styles.dialogDescription]}>
              می‌خواهید این فایل را کجا نگه دارید؟
            </Text>
            {backupActionError ? (
              <Text style={[theme.typography('bodySm'), styles.dialogError]}>
                {backupActionError}
              </Text>
            ) : null}
            <Button
              label="ذخیره در دستگاه"
              onPress={handleSaveBackupToDevice}
              loading={isSavingBackup}
              disabled={isSharingBackup}
              style={styles.backupReadyAction}
            />
            <Button
              label="اشتراک‌گذاری (تلگرام و...)"
              variant="secondary"
              onPress={handleShareBackup}
              loading={isSharingBackup}
              disabled={isSavingBackup}
              style={styles.backupReadyAction}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="بستن"
              onPress={() => setPendingBackup(null)}
              hitSlop={theme.spacing.space2}
              style={styles.backupReadyClose}
            >
              <Text style={[theme.typography('labelMd'), styles.editLabel]}>بستن</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={isImportWarningVisible}
        title="بازیابی نسخه پشتیبان"
        description="این کار تمام اطلاعات موجود در این دستگاه را با اطلاعات فایل انتخابی جایگزین می‌کند و غیرقابل بازگشت است. پیش از ادامه، در صورت نیاز از اطلاعات فعلی نسخه پشتیبان تهیه کنید."
        confirmLabel="انتخاب فایل"
        destructive
        isConfirming={isPickingImportFile}
        onConfirm={handleConfirmImportWarning}
        onCancel={() => setIsImportWarningVisible(false)}
      />

      <PasswordPromptDialog
        visible={importStep === 'password'}
        title="بازیابی نسخه پشتیبان"
        description="رمز عبور این نسخه پشتیبان را وارد کنید."
        confirmLabel="بازیابی اطلاعات"
        isSubmitting={isImporting}
        errorMessage={importError ?? undefined}
        onConfirm={handleConfirmImportPassword}
        onCancel={() => {
          setImportError(null)
          setPendingImportBytes(null)
          setImportStep('closed')
        }}
      />

      <InfoDialog
        visible={importStep === 'success'}
        title="بازیابی با موفقیت انجام شد"
        description="اطلاعات این دستگاه با نسخه پشتیبان جایگزین شد. برای مشاهده اطلاعات جدید، دوباره وارد حساب کاربری خود شوید."
        confirmLabel="ورود مجدد"
        onDismiss={handleFinishRestore}
      />
    </SafeAreaView>
  )
}

const COMPANY_SITE_URL = 'https://kssx.ir'

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space3 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary
    },
    avatarText: { color: theme.colors.onPrimary },
    profileText: { flex: 1, gap: 2, alignItems: start },
    phone: { color: theme.colors.onSurfaceVariant },
    inviteCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.large,
      padding: theme.spacing.space5,
      gap: theme.spacing.space2
    },
    inviteTitle: { color: theme.colors.onPrimary, alignSelf: start },
    inviteLead: { color: 'rgba(255,255,255,0.75)', alignSelf: start },
    inviteRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2, marginTop: theme.spacing.space2 },
    inviteCode: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.medium,
      backgroundColor: 'rgba(255,255,255,0.12)'
    },
    inviteCodeText: { color: theme.colors.onPrimary, letterSpacing: 3 },
    inviteShare: {
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.medium,
      backgroundColor: '#FFFFFF'
    },
    inviteShareText: { color: theme.colors.primary, fontWeight: '700' },
    inviteActions: { flexDirection: 'row', gap: theme.spacing.space2 },
    inviteAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.space2,
      minHeight: 44,
      paddingHorizontal: theme.spacing.space4,
      borderRadius: theme.radius.medium,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)'
    },
    inviteActionWide: { flex: 1 },
    inviteActionText: { color: theme.colors.onPrimary, fontWeight: '700' },
    list: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden'
    },
    deleteAccount: { alignSelf: 'center', paddingVertical: theme.spacing.space2 },
    deleteAccountText: { color: theme.colors.error },
    version: { color: theme.colors.outline, textAlign: 'center' },
    madeBy: {
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingVertical: theme.spacing.space4,
      minHeight: theme.touchTargetMinimum
    },
    madeByText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center'
    },
    madeByLink: {
      color: theme.colors.primary,
      textDecorationLine: 'underline'
    },
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
      justifyContent: 'space-between',
      // v2.9.2 — RN paints later siblings on top of earlier ones by
      // source order alone (position:absolute doesn't change that
      // without an explicit zIndex), so the menu below (rendered here,
      // before the Card) was painting BEHIND the Card that follows it
      // in the tree. zIndex fixes the stacking order directly.
      zIndex: 10
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
      // The menu button sits at the screen's outer edge (end of the
      // header row, RTL-mirrored) — anchoring the flyout by `start`
      // let it grow further past that edge, off-screen (reported: menu
      // clipped/unreadable). Anchoring by `end` instead pins it to the
      // button and grows the menu back toward the screen's visible area.
      end: 0,
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
    // v2.9.2 — tightened from titleMd(18/600), which read as an oversized
    // heading for what's just a field value, throughout this screen.
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
    statusRowSecondary: {
      marginTop: theme.spacing.space2
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
    backupButtonRow: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space3
    },
    backupButtonFlex: {
      flex: 1,
      marginTop: 0
    },
    backupButton: {
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.component.textField.radius,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    backupButtonLabel: {
      color: theme.colors.primary
    },
    backupReadyBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    },
    backupReadyCard: {
      width: '100%',
      maxWidth: 480,
      borderRadius: theme.radius.extraLarge,
      padding: theme.spacing.space6,
      gap: theme.spacing.space3,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      ...theme.elevation.level4
    },
    dialogTitle: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    dialogDescription: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    dialogError: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    backupReadyAction: {
      marginTop: theme.spacing.space1
    },
    backupReadyClose: {
      alignSelf: 'center',
      marginTop: theme.spacing.space1,
      minHeight: theme.touchTargetMinimum,
      justifyContent: 'center'
    }
  })
}
