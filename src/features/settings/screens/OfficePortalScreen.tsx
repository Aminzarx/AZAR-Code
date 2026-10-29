import React, { useEffect, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ConfirmDialog, Icon, QrCodeScanner, TextInput } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import { OFFICE_PANEL_URL, linkCodeOf, officeClient, officeErrorText } from '../services/officePanel'

const faDigits = (v: string) => v.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
/** 12345678 → «۱۲۳۴ ۵۶۷۸», as the dashboard shows it */
const showCode = (code: string) => faDigits(`${code.slice(0, 4)} ${code.slice(4)}`)

/**
 * Amin #5970: once the office panel is approved, the app gives way to it — this one screen, with the panel's address.
 * Nothing on the phone is wiped; turning the panel off brings the app back as it was.
 * Amin #6033 «ورود با ایوان»: the panel's sign-in page shows a code and its QR; scanning it here (or typing it, or
 * opening its eyvan://office-link link) and confirming signs that browser in — like signing in with Google.
 */
export function OfficePortalScreen(): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const [typed, setTyped] = useState('')
  const [scanning, setScanning] = useState(false)
  const [asking, setAsking] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function offer(raw: string): void {
    const code = linkCodeOf(raw)
    setError(code ? null : 'این کد ورود پنل دفتر نیست؛ کد ۸ رقمی صفحهٔ ورود پنل را اسکن یا وارد کنید.')
    setDone(false)
    if (code) setAsking(code)
  }

  // the QR scanned with the phone's own camera opens eyvan://office-link?c=…
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        if (url && url.startsWith('eyvan://office-link')) offer(url)
      })
      .catch(() => undefined)
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith('eyvan://office-link')) offer(url)
    })
    return () => sub.remove()
  }, [])

  async function confirm(code: string): Promise<void> {
    if (!session?.sessionToken) return
    setBusy(true)
    setError(null)
    try {
      await officeClient.officeLinkConfirm(session.sessionToken, code)
      setDone(true)
      setTyped('')
    } catch (e) {
      setError(officeErrorText(e))
    } finally {
      setBusy(false)
      setAsking(null)
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Icon name="building" size="lg" color={theme.colors.primary} />
        </View>
        <Text style={[theme.typography('headlineMd'), styles.title]}>پرتال دفتر املاک برای شما فعال است</Text>
        <Text style={[theme.typography('bodyMd'), styles.body]}>
          از این پس کار دفتر را در پنل کاربری kssx.ir انجام دهید. فایل‌های شما سر جایشان مانده‌اند.
        </Text>
        <Button label="باز کردن پنل" fullWidth onPress={() => Linking.openURL(OFFICE_PANEL_URL).catch(() => undefined)} />

        <View style={styles.card}>
          <Text style={[theme.typography('titleSm'), styles.cardTitle]}>ورود با ایوان</Text>
          <Text style={[theme.typography('bodySm'), styles.note]}>
            در صفحهٔ ورود پنل دفتر «ورود با ایوان» را بزنید؛ بعد کد آن را اینجا اسکن یا وارد کنید.
          </Text>
          <Button label="اسکن کد" variant="secondary" fullWidth onPress={() => setScanning(true)} />
          <TextInput
            label="کد ۸ رقمی"
            keyboardType="number-pad"
            value={typed}
            onChangeText={setTyped}
            maxLength={9}
            returnKeyType="done"
            onSubmitEditing={() => offer(typed)}
          />
          <Button label="تأیید ورود" fullWidth disabled={!typed.trim()} loading={busy} onPress={() => offer(typed)} />
          {done ? (
            <Text style={[theme.typography('bodySm'), styles.ok]}>ورود تأیید شد؛ پنل در همان مرورگر باز می‌شود.</Text>
          ) : null}
          {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
        </View>
      </ScrollView>

      <QrCodeScanner
        visible={scanning}
        title="اسکن کد ورود پنل دفتر"
        onScan={(value) => {
          setScanning(false)
          offer(value)
        }}
        onClose={() => setScanning(false)}
      />
      <ConfirmDialog
        visible={asking !== null}
        title="ورود به پنل دفتر"
        description={`ورود به پنل دفتر با کد ${asking ? showCode(asking) : ''} تأیید شود؟ اگر این کد را خودتان در پنل نگرفته‌اید، تأیید نکنید.`}
        confirmLabel="تأیید ورود"
        cancelLabel="انصراف"
        isConfirming={busy}
        onConfirm={() => {
          if (asking) confirm(asking).catch(() => undefined)
        }}
        onCancel={() => setAsking(null)}
      />
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.space6, gap: theme.spacing.space4, alignItems: 'stretch' },
    badge: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: theme.spacing.space6
    },
    title: { color: theme.colors.onSurface, textAlign: 'center' },
    body: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space4
    },
    cardTitle: { color: theme.colors.onSurface, alignSelf: start },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    ok: { color: theme.colors.primary, alignSelf: start },
    error: { color: theme.colors.error, alignSelf: start }
  })
}
