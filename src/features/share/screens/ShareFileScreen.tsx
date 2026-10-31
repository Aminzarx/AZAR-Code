import React, { useEffect, useState } from 'react'
import { Clipboard, Linking, Share, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ErrorState, FormScreenContainer, Icon, LoadingIndicator } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { useAuth } from '@features/auth/AuthProvider'
import { useProfile } from '@features/settings/hooks/useProfile'
import { usePropertyDetail } from '@features/property/hooks/usePropertyDetail'
import { usePhotoRepository } from '@features/photos/hooks/usePhotoRepository'
import {
  DEFAULT_SHARE_OPTIONS,
  buildSharedFile,
  hiddenSummary,
  shareMessage,
  timeLeft,
  toggleOption,
  type ShareOptions,
  type SharedPhoto
} from '../shareFile'
import { createShare, shareErrorText, type CreatedShare } from '../services/shareClient'

type Props = NativeStackScreenProps<MainStackParamList, 'ShareFile'>

/** a share's photos together stay under the server's body limit (16 MB of JSON) */
const MAX_PHOTO_CHARS = 14 * 1000 * 1000

/**
 * Amin #6339/#6341/#6523: «اشتراک‌گذاری» on a file opens «تنظیمات اشتراک فایل»: what the other side must not see
 * (owner's number hidden or replaced with mine, address, photos, description, prices…), then «ساخت لینک یک‌بار مصرف».
 * The same page then shows the barcode, the hour counting down, «کپی لینک», «ارسال پیامک» (the phone's own SMS app)
 * and «اشتراک». The link opens only inside EYVAN, works once and lasts one hour.
 */
export function ShareFileScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { propertyId } = route.params
  const { property, isLoading, error } = usePropertyDetail(propertyId)
  const { session, loadPhoto } = useAuth()
  const { profile } = useProfile()
  const photos = usePhotoRepository()
  const [photoCount, setPhotoCount] = useState(0)
  const [options, setOptions] = useState<ShareOptions>(DEFAULT_SHARE_OPTIONS)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [made, setMade] = useState<CreatedShare | null>(null)

  useEffect(() => {
    photos
      ?.listFor('property', propertyId)
      .then((list) => setPhotoCount(list.length))
      .catch(() => undefined)
  }, [photos, propertyId])

  const set = (key: keyof ShareOptions) => (value: boolean) => setOptions((o) => toggleOption(o, key, value))

  async function readPhotos(): Promise<SharedPhoto[] | null> {
    if (options.hidePhotos || !photos) return []
    const list = await photos.listFor('property', propertyId)
    const out: SharedPhoto[] = []
    let chars = 0
    for (const p of list) {
      const data = await loadPhoto({ data: p.data, blobHash: p.blobHash })
      if (!data) {
        setProblem('عکس‌های این فایل الان در دسترس نیست. اینترنت را بررسی کنید یا «پنهان کردن عکس‌ها» را روشن کنید.')
        return null
      }
      chars += data.length
      if (chars > MAX_PHOTO_CHARS) {
        setProblem('عکس‌های این فایل برای اشتراک زیاد است. «پنهان کردن عکس‌ها» را روشن کنید.')
        return null
      }
      out.push({ data, bytes: p.bytes, width: p.width, height: p.height })
    }
    return out
  }

  async function make(): Promise<void> {
    if (!property || !session || busy) return
    setBusy(true)
    setProblem(null)
    try {
      const shared = await readPhotos()
      if (!shared) return
      const file = buildSharedFile(property, options, profile, shared)
      setMade(await createShare(session.sessionToken, file))
    } catch (e) {
      setProblem(shareErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  const myPhone = profile.phoneNumber ? toPersianDigits(formatIranPhoneNumberForDisplay(profile.phoneNumber)) : null
  const realOwner = Boolean(property?.owner) && !options.hideOwnerPhone && !options.ownerAsMe

  return (
    <FormScreenContainer
      headerTitle={made ? 'لینک اشتراک فایل' : 'تنظیمات اشتراک فایل'}
      onBack={() => navigation.goBack()}
    >
      {isLoading ? (
        <View style={styles.centered}>
          <LoadingIndicator size="large" />
        </View>
      ) : error || !property ? (
        <View style={styles.centered}>
          <ErrorState title="فایل پیدا نشد" />
        </View>
      ) : made ? (
        <ShareLink
          made={made}
          title={property.title}
          styles={styles}
          theme={theme}
          onAgain={() => setMade(null)}
          onDone={() => navigation.goBack()}
        />
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Icon name="share" size="sm" color={theme.colors.primary} />
              </View>
              <View style={styles.text}>
                <Text style={[theme.typography('labelMd'), styles.note]}>فایلی که فرستاده می‌شود</Text>
                <Text style={[theme.typography('titleMd'), styles.title]}>{property.title}</Text>
              </View>
            </View>
          </View>

          <Text style={[theme.typography('titleSm'), styles.section]}>چه چیزی دیده نشود</Text>
          <View style={styles.card}>
            <OptionRow
              label="پنهان کردن شمارهٔ مالک"
              hint={property.owner ? 'نام و شمارهٔ مالک فرستاده نمی‌شود.' : 'این فایل مالک ثبت‌شده ندارد.'}
              value={options.hideOwnerPhone}
              onChange={set('hideOwnerPhone')}
              styles={styles}
              theme={theme}
            />
            <OptionRow
              label="جایگزینی شمارهٔ مالک با شمارهٔ من"
              hint={myPhone ? `گیرنده به جای مالک، شمارهٔ شما (${myPhone}) را می‌بیند.` : 'شمارهٔ شما هنوز خوانده نشده است.'}
              value={options.ownerAsMe}
              disabled={!myPhone}
              onChange={set('ownerAsMe')}
              styles={styles}
              theme={theme}
            />
            {realOwner ? (
              <>
                <OptionRow
                  label="پنهان کردن نام مالک"
                  hint="به جای نام، «مالک» نوشته می‌شود."
                  value={options.hideOwnerName}
                  onChange={set('hideOwnerName')}
                  styles={styles}
                  theme={theme}
                />
                <OptionRow
                  label="پنهان کردن یادداشت مالک"
                  value={options.hideOwnerNotes}
                  onChange={set('hideOwnerNotes')}
                  styles={styles}
                  theme={theme}
                />
              </>
            ) : null}
            <OptionRow
              label="پنهان کردن آدرس"
              hint="شهر و منطقه می‌ماند؛ آدرس دقیق فرستاده نمی‌شود."
              value={options.hideAddress}
              onChange={set('hideAddress')}
              styles={styles}
              theme={theme}
            />
            <OptionRow
              label="پنهان کردن عکس‌ها"
              hint={photoCount ? `${toPersianDigits(String(photoCount))} عکس دارد.` : 'این فایل عکسی ندارد.'}
              value={options.hidePhotos}
              onChange={set('hidePhotos')}
              styles={styles}
              theme={theme}
            />
            <OptionRow
              label="پنهان کردن توضیحات"
              value={options.hideDescription}
              onChange={set('hideDescription')}
              styles={styles}
              theme={theme}
            />
            <OptionRow
              label="پنهان کردن قیمت‌ها"
              hint="قیمت، رهن و اجاره فرستاده نمی‌شود."
              value={options.hidePrices}
              onChange={set('hidePrices')}
              styles={styles}
              theme={theme}
              last
            />
          </View>

          <Text style={[theme.typography('bodySm'), styles.note]}>فرستاده می‌شود: {hiddenSummary(options)}</Text>
          {problem ? <Text style={[theme.typography('bodySm'), styles.error]}>{problem}</Text> : null}
          <Button label="ساخت لینک یک‌بار مصرف" loading={busy} disabled={!session} onPress={() => void make()} />
          <Text style={[theme.typography('bodySm'), styles.note]}>
            لینک فقط در اپ ایوان باز می‌شود، یک ساعت اعتبار دارد و فقط یک‌بار کار می‌کند.
          </Text>
        </>
      )}
    </FormScreenContainer>
  )
}

function OptionRow({
  label,
  hint,
  value,
  disabled,
  onChange,
  styles,
  theme,
  last
}: {
  label: string
  hint?: string
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  styles: ReturnType<typeof createStyles>
  theme: Theme
  last?: boolean
}): React.JSX.Element {
  return (
    <View style={[styles.option, last && styles.optionLast]}>
      <View style={styles.text}>
        <Text style={[theme.typography('bodyMd'), styles.title, disabled && styles.disabled]}>{label}</Text>
        {hint ? <Text style={[theme.typography('bodySm'), styles.note]}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.outlineVariant }}
      />
    </View>
  )
}

/** the made link: barcode, the hour counting down, copy / SMS / share */
function ShareLink({
  made,
  title,
  styles,
  theme,
  onAgain,
  onDone
}: {
  made: CreatedShare
  title: string
  styles: ReturnType<typeof createStyles>
  theme: Theme
  onAgain: () => void
  onDone: () => void
}): React.JSX.Element {
  const { width } = useWindowDimensions()
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)
  const [smsProblem, setSmsProblem] = useState<string | null>(null)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const left = timeLeft(made.expiresAt, now)
  const message = shareMessage(made.link, title)
  const size = Math.min(260, width - theme.spacing.space4 * 6)

  if (!left) {
    return (
      <View style={styles.card}>
        <Text style={[theme.typography('titleSm'), styles.title]}>اعتبار این لینک تمام شد</Text>
        <Text style={[theme.typography('bodySm'), styles.note]}>اگر گیرنده آن را باز نکرده، لینک تازه بسازید.</Text>
        <Button label="ساخت لینک تازه" onPress={onAgain} />
      </View>
    )
  }
  return (
    <>
      <View style={[styles.card, styles.qrCard]}>
        <Text style={[theme.typography('titleSm'), styles.qrTitle]}>{title}</Text>
        <View style={styles.qrWhite}>
          <QRCode value={made.link} size={size} color="#0F172A" backgroundColor="#FFFFFF" />
        </View>
        <View style={styles.timer}>
          <Icon name="time" size="xs" color={theme.colors.onWarningContainer} />
          <Text style={[theme.typography('labelMd'), styles.timerText]}>{`اعتبار: ${left}`}</Text>
        </View>
        <Text style={[theme.typography('bodySm'), styles.center]}>
          گیرنده در ایوانِ خودش «تنظیمات ← دریافت فایل» را می‌زند و این بارکد را اسکن می‌کند، یا لینک را باز می‌کند.
          لینک یک‌بار مصرف است.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={copied ? 'کپی شد' : 'کپی لینک'}
          variant="secondary"
          style={styles.action}
          onPress={() => {
            Clipboard.setString(made.link)
            setCopied(true)
          }}
        />
        <Button
          label="ارسال پیامک"
          variant="secondary"
          style={styles.action}
          onPress={() => {
            setSmsProblem(null)
            Linking.openURL(`sms:?body=${encodeURIComponent(message)}`).catch(() =>
              setSmsProblem('برنامهٔ پیامک گوشی باز نشد. «کپی لینک» را بزنید و در پیامک بگذارید.')
            )
          }}
        />
      </View>
      {smsProblem ? <Text style={[theme.typography('bodySm'), styles.error]}>{smsProblem}</Text> : null}
      <Button
        label="اشتراک"
        onPress={() => {
          Share.share({ message }).catch(() => undefined)
        }}
      />
      <Button label="بازگشت به فایل" variant="text" onPress={onDone} />
    </>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.space12 },
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space2,
      marginBottom: theme.spacing.space3
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space3 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: { flex: 1, gap: 2 },
    title: { color: theme.colors.onSurface, alignSelf: start },
    section: { color: theme.colors.onSurface, alignSelf: start, marginBottom: theme.spacing.space2 },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start, marginBottom: theme.spacing.space2 },
    disabled: { color: theme.colors.onSurfaceVariant },
    error: { color: theme.colors.error, alignSelf: start, marginBottom: theme.spacing.space2 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingVertical: theme.spacing.space2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant
    },
    optionLast: { borderBottomWidth: 0 },
    qrCard: { alignItems: 'center', gap: theme.spacing.space3 },
    qrTitle: { color: theme.colors.onSurface, textAlign: 'center' },
    qrWhite: { backgroundColor: '#FFFFFF', padding: theme.spacing.space3, borderRadius: theme.radius.large },
    timer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space1,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.warningContainer
    },
    timerText: { color: theme.colors.onWarningContainer },
    center: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: theme.spacing.space3, marginBottom: theme.spacing.space3 },
    action: { flex: 1 }
  })
}
