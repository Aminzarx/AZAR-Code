import React, { useCallback, useEffect, useState } from 'react'
import { SubscriptionCard } from '@features/licence/SubscriptionCard'
import {
  Clipboard,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useAppearance, useTheme, type AppearanceMode, type Theme } from '@shared/theme'
import {
  ConfirmDialog,
  Icon,
  LogoPlaceholder,
  MarqueeText,
  OtpPromptDialog,
  SegmentedControl
} from '@shared/components'
import { getDatabase } from '@infrastructure/database/connection'
import {
  SessionRepository,
  type SessionRecord
} from '@infrastructure/database/repositories/SessionRepository'
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus'
import { formatDateTime } from '@shared/utils/formatDate'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { APP_VERSION } from '@shared/appVersion'
import { InviteSmsDialog } from '../components/InviteSmsDialog'
import { SettingsRow } from '../components/SettingsRow'
import { OptionsSheet, type SheetOption } from '../components/OptionsSheet'
import { useProfile } from '../hooks/useProfile'
import { TokenCard } from '../components/TokenCard'
import { normalizeSummary, type TokenSummary } from '../services/tokenLedger'
import { photoUri } from '@infrastructure/images/profilePhoto'
import type { SupportContacts } from '@infrastructure/auth/httpAuthApiClient'
import { ValidationFailureError } from '@core/auth/errors'

const APP_DOWNLOAD_URL = 'https://kssx.ir/fa/solutions/apps' // Amin #5135: the download lives on kssx.ir's apps page

/** «۱۲٫۴» — Persian digits, Persian decimal and thousands marks */
function persianNumber(value: number): string {
  const [whole, fraction] = String(value).split('.')
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
  return toPersianDigits(fraction ? `${grouped}٫${fraction}` : grouped)
}

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>

type DeleteAccountStep = 'closed' | 'confirm' | 'otp'

/**
 * The referral code used to live on the very first screen after
 * registration (BasicProfileScreen, now removed) and in the Dashboard
 * header — visible every time the app opened. Moved here so it's still
 * always reachable, just not forced on the user by default.
 */
export function SettingsScreen(props: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const appearance = useAppearance()
  const { session, logout, sendOtp, verifyOtp, deleteAccount, getSupportContacts, getTokenLedger, sync, syncNow } =
    useAuth()
  const { profile } = useProfile()
  const displayName = profile.displayName
  const phoneNumber = profile.phoneNumber
  const isOnline = useNetworkStatus()
  const [isSupportSheetVisible, setIsSupportSheetVisible] = useState(false)
  const [support, setSupport] = useState<SupportContacts | null>(null)
  const [supportError, setSupportError] = useState<string | null>(null)
  const [sessionRecord, setSessionRecord] = useState<SessionRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [isInviteVisible, setIsInviteVisible] = useState(false)
  const [isQrVisible, setIsQrVisible] = useState(false)
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false)
  const [unsentAtLogout, setUnsentAtLogout] = useState(0)
  const [deleteStep, setDeleteStep] = useState<DeleteAccountStep>('closed')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<{ summary: TokenSummary | null; fresh: boolean }>({ summary: null, fresh: true })

  // Amin #5108: tokens change only when a file, an applicant or a contract is saved — so asked again on every visit
  // and after each sync round
  const loadTokens = useCallback(() => {
    getTokenLedger()
      .then((result) => setTokens({ summary: normalizeSummary(result?.ledger.summary), fresh: result?.fresh ?? true }))
      .catch(() => undefined)
  }, [getTokenLedger])

  useEffect(() => {
    if (sync.state === 'idle') loadTokens()
  }, [loadTokens, sync.state, sync.pending])

  useEffect(() => {
    if (typeof props.navigation.addListener !== 'function') {
      return undefined
    }
    return props.navigation.addListener('focus', loadTokens)
  }, [props.navigation, loadTokens])

  useEffect(() => {
    let cancelled = false
    if (!session) {
      return
    }
    getDatabase().then((db) => {
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

  function openSupport(): void {
    setIsSupportSheetVisible(true)
    setSupportError(null)
    getSupportContacts()
      .then(setSupport)
      .catch(() => setSupportError('برای دیدن راه‌های پشتیبانی به اینترنت وصل شوید.'))
  }

  /**
   * v1.5.0 (Amin #4632): help goes to the company's support number in the
   * messenger the user picks. Every message opens with the support line
   * (server setting) so the company's IRIS files it under «پشتیبانی اپلیکیشن».
   */
  function supportOptions(): SheetOption[] {
    const prefix = support?.prefix ?? 'پشتیبانی اپلیکیشن ایوان'
    const text = `${prefix}\n${displayName ? `${displayName} — ` : ''}${phoneNumber ? toPersianDigits(formatIranPhoneNumberForDisplay(phoneNumber)) : ''}\n`
    const open = (url: string, copyFirst = false) => () => {
      if (copyFirst) Clipboard.setString(text)
      setIsSupportSheetVisible(false)
      Linking.openURL(url).catch(() => setSupportError('این پیام‌رسان روی گوشی نصب نیست.'))
    }
    const soon = 'به‌زودی'
    return [
      {
        icon: 'whatsapp',
        label: 'واتس‌اپ',
        tint: '#25D366',
        description: support?.whatsapp ? 'گفت‌وگو با پشتیبانی' : soon,
        disabled: !support?.whatsapp,
        onPress: open(`https://wa.me/${support?.whatsapp ?? ''}?text=${encodeURIComponent(text)}`)
      },
      {
        icon: 'telegram',
        label: 'تلگرام',
        tint: '#229ED9',
        description: support?.telegram ? 'گفت‌وگو با پشتیبانی' : soon,
        disabled: !support?.telegram,
        onPress: open(`https://t.me/${support?.telegram ?? ''}?text=${encodeURIComponent(text)}`)
      },
      {
        icon: 'chat',
        label: 'روبیکا',
        tint: '#7B3FE4',
        description: support?.rubika ? 'متن آغاز پیام کپی می‌شود؛ در گفت‌وگو بچسبانید' : soon,
        disabled: !support?.rubika,
        onPress: open(`https://rubika.ir/${support?.rubika ?? ''}`, true)
      }
    ]
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

  /** AZAR-SYNC-001: sends what is waiting first, so signing out loses nothing when online. */
  async function handleAskLogout(): Promise<void> {
    setUnsentAtLogout(await syncNow().catch(() => sync.pending))
    setIsLogoutConfirmVisible(true)
  }

  /** AZAR-SYNC-001 (Amin #4797): where the account's files stand against the server */
  function syncSummary(): string {
    if (sync.state === 'full') return 'توکن‌ها تمام شده؛ تغییرهای تازه فعلاً فقط روی این گوشی است'
    if (sync.pending > 0) {
      return sync.state === 'offline'
        ? `${persianNumber(sync.pending)} تغییر منتظر اینترنت است`
        : `در حال ذخیرهٔ ${persianNumber(sync.pending)} تغییر`
    }
    return 'همهٔ پرونده‌ها روی حساب شما ذخیره شده است'
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
      <ScrollView contentContainerStyle={styles.content} accessibilityLabel="تنظیمات">
        {/* v1.4.0 (approved «من» design): who you are, the invite card, then one list */}
        <View style={styles.profileRow}>
          {photoUri(profile.photoPath) ? (
            <Image
              source={{ uri: photoUri(profile.photoPath) ?? undefined }}
              style={styles.avatar}
              accessibilityLabel="عکس پروفایل"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <LogoPlaceholder style={styles.avatar} logoShare={0.6} />
          )}
          <View style={styles.profileText}>
            <MarqueeText style={[theme.typography('titleMd'), styles.value]}>
              {displayName || 'نام ثبت نشده'}
            </MarqueeText>
            <Text style={[theme.typography('bodySm'), styles.phone]}>
              {phoneNumber ? toPersianDigits(formatIranPhoneNumberForDisplay(phoneNumber)) : '-'}
              {profile.agencyName ? ` · ${profile.agencyName}` : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ویرایش پروفایل"
            onPress={() => props.navigation.navigate('Profile')}
            hitSlop={theme.spacing.space2}
            style={styles.editButton}
          >
            <Icon name="edit" size="xs" color={theme.colors.primary} />
            <Text style={[theme.typography('labelMd'), styles.editLabel]}>ویرایش</Text>
          </Pressable>
        </View>

        {/* Amin #4906: the subscription first, right under who you are */}
        <SubscriptionCard />

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
                  <Icon name="copy" size="sm" color={theme.colors.onBrand} />
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
                <Icon name="sms" size="sm" color={theme.colors.onBrand} />
                <Text style={[theme.typography('labelMd'), styles.inviteActionText]}>دعوت با پیامک</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="نمایش بارکد"
                onPress={() => setIsQrVisible(true)}
                style={styles.inviteAction}
              >
                <Icon name="qr" size="sm" color={theme.colors.onBrand} />
              </Pressable>
            </View>
            <ReferralQrPopup code={session.referralCode} visible={isQrVisible} onClose={() => setIsQrVisible(false)} />
          </View>
        ) : null}

        {/* Amin #5103/#5106: the token card back on Settings itself; the ⓘ holds the breakdown (#5105: no history page) */}
        <TokenCard summary={tokens.summary} fresh={tokens.fresh} />

        {/* Amin #5055: night mode; the phone's own setting is the default */}
        <View style={styles.tokenCard} accessibilityLabel="حالت نمایش">
          <View style={styles.tokenHead}>
            <View style={styles.tokenIcon}>
              <Icon name="moon" size="sm" color={theme.colors.primary} />
            </View>
            <Text style={[theme.typography('titleSm'), styles.tokenTitle]}>حالت نمایش</Text>
          </View>
          <SegmentedControl options={APPEARANCE_OPTIONS} value={appearance.mode} onChange={appearance.setMode} />
        </View>

        <View style={styles.list}>
          <SettingsRow
            icon="cloud"
            label="ذخیره روی سرور"
            value={syncSummary()}
            onPress={() => {
              syncNow().catch(() => undefined)
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
            value="پیام به پشتیبانی در واتس‌اپ، تلگرام یا روبیکا"
            onPress={openSupport}
          />
          <SettingsRow
            icon="logout"
            label="خروج از حساب"
            destructive
            onPress={() => {
              handleAskLogout().catch(() => undefined)
            }}
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
      />

      <OptionsSheet
        visible={isSupportSheetVisible}
        title="راهنما و پشتیبانی"
        lead={supportError ?? 'پیام‌رسان دلخواهتان را انتخاب کنید تا با پشتیبانی ایوان گفت‌وگو کنید.'}
        onClose={() => setIsSupportSheetVisible(false)}
        options={supportOptions()}
      />

      <ConfirmDialog
        visible={isLogoutConfirmVisible}
        title="خروج از حساب"
        description={
          unsentAtLogout > 0
            ? `${persianNumber(unsentAtLogout)} تغییر هنوز به سرور نرسیده و با خروج از این گوشی پاک می‌شود. برای نگه داشتن آن‌ها، اول به اینترنت وصل شوید.`
            : 'پرونده‌هایتان روی حساب شما می‌ماند و از این گوشی پاک می‌شود؛ با ورود دوباره، همه برمی‌گردد.'
        }
        confirmLabel={unsentAtLogout > 0 ? 'خروج و پاک کردن' : 'خروج'}
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

    </SafeAreaView>
  )
}

const COMPANY_SITE_URL = 'https://kssx.ir'

const APPEARANCE_OPTIONS: readonly { value: AppearanceMode; label: string }[] = [
  { value: 'light', label: 'روشن' },
  { value: 'dark', label: 'تیره' },
  { value: 'system', label: 'هماهنگ با گوشی' }
]

/** Amin #5160: the referrer's barcode opens in its own popup, as wide as the screen allows with a proper margin */
function ReferralQrPopup({
  code,
  visible,
  onClose
}: {
  code: string
  visible: boolean
  onClose: () => void
}): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { width, height } = useWindowDimensions()
  const cardWidth = Math.min(width - theme.spacing.space6 * 2, height * 0.6, 380)
  const qrSize = Math.round(cardWidth - theme.spacing.space5 * 2)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.qrBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن بارکد">
        <Pressable style={[styles.qrPopup, { width: cardWidth }]} onPress={(event) => event.stopPropagation()}>
          <Text style={[theme.typography('titleSm'), styles.qrTitle]}>بارکد معرف</Text>
          <View style={styles.qrWhite}>
            <QRCode value={code} size={qrSize - theme.spacing.space3 * 2} color={theme.colors.brand} backgroundColor="#FFFFFF" />
          </View>
          <Text style={[theme.typography('titleMd'), styles.qrCode]}>{code}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="بستن" onPress={onClose} style={styles.qrClose}>
            <Text style={[theme.typography('labelMd'), styles.qrCloseText]}>بستن</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space3 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28
    },
    profileText: { flex: 1, gap: 2, alignItems: start },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer
    },
    tokenCard: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space2
    },
    tokenHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2 },
    tokenIcon: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    tokenTitle: { color: theme.colors.onSurface },
    phone: { color: theme.colors.onSurfaceVariant },
    inviteCard: {
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radius.large,
      padding: theme.spacing.space5,
      gap: theme.spacing.space2
    },
    inviteTitle: { color: theme.colors.onBrand, alignSelf: start },
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
    inviteCodeText: { color: theme.colors.onBrand, letterSpacing: 3 },
    inviteShare: {
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.medium,
      backgroundColor: '#FFFFFF'
    },
    inviteShareText: { color: theme.colors.brand, fontWeight: '700' },
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
    inviteActionText: { color: theme.colors.onBrand, fontWeight: '700' },
    list: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden'
    },
    deleteAccount: { alignSelf: 'center', paddingVertical: theme.spacing.space2 },
    deleteAccountText: { color: theme.colors.error },
    version: { color: theme.colors.outline, textAlign: 'center' }, // rtl-allow: centred page footer
    madeBy: {
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingVertical: theme.spacing.space4,
      minHeight: theme.touchTargetMinimum
    },
    madeByText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center' // rtl-allow: centred page footer
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
    qrBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15,23,42,0.55)'
    },
    qrPopup: {
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space5,
      borderRadius: theme.radius.extraLarge,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    qrTitle: { color: theme.colors.onSurface },
    qrWhite: { padding: theme.spacing.space3, borderRadius: theme.radius.large, backgroundColor: '#FFFFFF' },
    qrClose: {
      alignSelf: 'stretch',
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.primary
    },
    qrCloseText: { color: theme.colors.onPrimary },
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
    }
  })
}
