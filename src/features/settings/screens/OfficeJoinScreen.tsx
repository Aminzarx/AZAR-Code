import React, { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ConfirmDialog, EmptyState, FormScreenContainer, Icon, LoadingIndicator, QrCodeScanner, TextInput } from '@shared/components'
import { toEnglishDigits, toPersianDigits } from '@shared/utils/persianText'
import { useAuth } from '@features/auth/AuthProvider'
import type { OfficeAdviserView, OfficeSentFile } from '@infrastructure/sync/syncApiClient'
import { joinEntryOf, linkCodeOf, officeClient, officeErrorText } from '../services/officePanel'

type Props = NativeStackScreenProps<MainStackParamList, 'OfficeJoin'>

const money = (n: number | null) => (n ? `${toPersianDigits(Math.round(n).toLocaleString('en-US')).replace(/,/g, '٬')} تومان` : null)
const num = (n: number | null) => (n ? toPersianDigits(String(n)) : null)

/**
 * Amin #6330: «اتصال به داشبورد دفتر» (under «دفتر املاک») — an adviser joins a real-estate office with the one-time code + word the office
 * dashboard makes («ساخت کد اتصال مشاور»): typed, or scanned from its QR. Once in, the files the office sent show here,
 * only with the fields the office allowed; «جدا شدن از دفتر» leaves (the office's sends to this adviser end).
 * One office at a time: joining another one leaves the previous office (the server's rule).
 */
export function OfficeJoinScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const token = session?.sessionToken
  const [view, setView] = useState<OfficeAdviserView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [code, setCode] = useState('')
  const [word, setWord] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    try {
      setView(await officeClient.officeAdviserFiles(token))
      setLoadError(null)
    } catch (e) {
      setLoadError(officeErrorText(e))
    }
  }, [token])
  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const codeOk = linkCodeOf(code)
  const problems = { code: codeOk ? undefined : 'کد ۸ رقمی را بنویسید.', word: word.trim() ? undefined : 'کلمه را بنویسید.' }

  async function join(c: string, w: string): Promise<void> {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await officeClient.officeJoin(token, c, w)
      setCode('')
      setWord('')
      setTouched(false)
      await load()
    } catch (e) {
      setError(officeErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  function scanned(value: string): void {
    setScanning(false)
    const entry = joinEntryOf(value)
    if (!entry) {
      setError('این بارکد، کد اتصال دفتر املاک نیست. در داشبورد دفتر «ساخت کد اتصال مشاور» را بزنید.')
      return
    }
    setCode(toPersianDigits(entry.code))
    setWord(entry.word)
    join(entry.code, entry.word).catch(() => undefined)
  }

  async function leave(): Promise<void> {
    if (!token) return
    setBusy(true)
    try {
      await officeClient.officeLeave(token)
      setLeaving(false)
      await load()
    } catch (e) {
      setLeaving(false)
      setError(officeErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  const office = view?.office ?? null
  return (
    <FormScreenContainer headerTitle="اتصال به داشبورد دفتر" onBack={() => navigation.goBack()}>
      {!view ? (
        loadError ? (
          <View style={styles.card}>
            <Text style={[theme.typography('bodyMd'), styles.error]}>{loadError}</Text>
            <Button label="دوباره" variant="secondary" onPress={() => load().catch(() => undefined)} />
          </View>
        ) : (
          <LoadingIndicator />
        )
      ) : office ? (
        <>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Icon name="building" size="sm" color={theme.colors.primary} />
              </View>
              <View style={styles.text}>
                <Text style={[theme.typography('labelMd'), styles.note]}>شما مشاور این دفتر هستید</Text>
                <Text style={[theme.typography('titleMd'), styles.title]}>{office.name}</Text>
              </View>
            </View>
          </View>
          <Text style={[theme.typography('titleSm'), styles.section]}>
            فایل‌های دفتر{view.files.length ? ` (${toPersianDigits(String(view.files.length))})` : ''}
          </Text>
          {view.files.length ? (
            view.files.map((f) => <SentFile key={f.id} file={f} styles={styles} theme={theme} />)
          ) : (
            <EmptyState compact title="هنوز فایلی نفرستاده‌اند" description="فایل‌هایی که دفتر برای شما بفرستد این‌جا دیده می‌شوند." />
          )}
          <Button
            label="تازه کردن"
            variant="secondary"
            loading={refreshing}
            onPress={() => {
              setRefreshing(true)
              load().finally(() => setRefreshing(false))
            }}
          />
          {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
          <Button label="جدا شدن از دفتر" variant="destructive" loading={busy} onPress={() => setLeaving(true)} />
        </>
      ) : (
        <View style={styles.form}>
          <Text style={[theme.typography('bodyMd'), styles.body]}>
            مدیر دفتر در داشبورد دفتر «ساخت کد اتصال مشاور» را می‌زند. بارکد آن را اسکن کنید، یا کد و کلمه را بنویسید.
          </Text>
          <Button label="اسکن بارکد کد اتصال" onPress={() => setScanning(true)} disabled={busy} />
          <TextInput
            label="کد اتصال"
            required
            placeholder="۱۲۳۴۵۶۷۸"
            keyboardType="number-pad"
            maxLength={9}
            value={code}
            onChangeText={(v) => setCode(toPersianDigits(toEnglishDigits(v)))}
            errorMessage={touched ? problems.code : undefined}
          />
          <TextInput
            label="کلمه"
            required
            value={word}
            onChangeText={setWord}
            errorMessage={touched ? problems.word : undefined}
          />
          {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
          <Button
            label="اتصال به دفتر"
            loading={busy}
            onPress={() => {
              setTouched(true)
              if (codeOk && word.trim()) join(codeOk, word.trim()).catch(() => undefined)
            }}
          />
          <Text style={[theme.typography('bodySm'), styles.note]}>
            هر کد یک‌بار مصرف است و ۷ روز اعتبار دارد. با وصل شدن به یک دفتر تازه، از دفتر قبلی جدا می‌شوید.
          </Text>
        </View>
      )}
      <QrCodeScanner visible={scanning} title="اسکن بارکد کد اتصال" onScan={scanned} onClose={() => setScanning(false)} />
      <ConfirmDialog
        visible={leaving}
        title="جدا شدن از دفتر"
        description={`از «${office?.name ?? ''}» جدا می‌شوید و فایل‌هایی که این دفتر برایتان فرستاده دیگر دیده نمی‌شوند. برای وصل شدن دوباره، کد تازه لازم است.`}
        confirmLabel="جدا شو"
        cancelLabel="انصراف"
        isConfirming={busy}
        onConfirm={() => {
          leave().catch(() => undefined)
        }}
        onCancel={() => setLeaving(false)}
      />
    </FormScreenContainer>
  )
}

/** one sent file: title, then only the facts the office shared */
function SentFile({ file: f, styles, theme }: { file: OfficeSentFile; styles: ReturnType<typeof createStyles>; theme: Theme }): React.JSX.Element {
  const facts = [
    f.kind,
    f.propertyType,
    [f.city, f.region].filter(Boolean).join('، ') || null,
    f.size ? `${num(f.size)} متر` : null,
    f.rooms ? `${num(f.rooms)} خواب` : null
  ].filter(Boolean)
  const prices = [
    f.price ? `قیمت ${money(f.price)}` : null,
    f.deposit ? `رهن ${money(f.deposit)}` : null,
    f.rent ? `اجاره ${money(f.rent)}` : null
  ].filter(Boolean)
  return (
    <View style={styles.card} accessibilityLabel={f.title ?? 'فایل دفتر'}>
      <Text style={[theme.typography('titleSm'), styles.title]}>{f.title || 'فایل بی‌عنوان'}</Text>
      {facts.length ? <Text style={[theme.typography('bodySm'), styles.note]}>{facts.join(' · ')}</Text> : null}
      {prices.length ? <Text style={[theme.typography('labelMd'), styles.title]}>{prices.join(' · ')}</Text> : null}
      {f.address ? <Text style={[theme.typography('bodySm'), styles.body]}>آدرس: {f.address}</Text> : null}
      {f.description ? <Text style={[theme.typography('bodySm'), styles.body]}>{f.description}</Text> : null}
      {f.ownerName || f.ownerPhone ? (
        <View style={styles.ownerRow}>
          <Text style={[theme.typography('bodySm'), styles.body]}>
            مالک: {[f.ownerName, f.ownerPhone ? toPersianDigits(f.ownerPhone) : null].filter(Boolean).join(' · ')}
          </Text>
          {f.ownerPhone ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تماس با مالک"
              hitSlop={theme.spacing.space2}
              onPress={() => {
                Linking.openURL(`tel:${toEnglishDigits(f.ownerPhone ?? '')}`).catch(() => undefined)
              }}
            >
              <Icon name="phone" size="sm" color={theme.colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space2,
      marginBottom: theme.spacing.space3
    },
    form: { gap: theme.spacing.space4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space3 },
    ownerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.space2 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: { flex: 1, gap: theme.spacing.space1 },
    title: { color: theme.colors.onSurface, alignSelf: start },
    section: { color: theme.colors.onSurface, alignSelf: start, marginBottom: theme.spacing.space2 },
    body: { color: theme.colors.onSurface, alignSelf: start, flexShrink: 1 },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    error: { color: theme.colors.error, alignSelf: start }
  })
}
