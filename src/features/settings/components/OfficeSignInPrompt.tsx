import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon } from '@shared/components'
import type { OfficeSignIn } from '@infrastructure/sync/syncApiClient'
import { officeClient, officeErrorText } from '../services/officePanel'

/** Amin #6346: hold the button this long to sign the dashboard in */
export const HOLD_MS = 3000
const faDigits = (v: string) => v.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

/**
 * Amin #6346: the manager typed this phone's number on the office dashboard; this screen opens at once over the app
 * and holding «نگه دارید تا وارد شوید» for 3 seconds signs that dashboard in (letting go earlier starts over).
 * «این ورود من نیست» refuses it and the dashboard is told.
 */
export function OfficeSignInPrompt({ sessionToken, link, onDone }: {
  sessionToken: string
  link: OfficeSignIn
  onDone: (code: string) => void
}): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const progress = useRef(new Animated.Value(0)).current
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [left, setLeft] = useState(() => secondsLeft(link.expiresAt))

  useEffect(() => {
    const t = setInterval(() => setLeft(secondsLeft(link.expiresAt)), 1000)
    return () => clearInterval(t)
  }, [link.expiresAt])
  useEffect(() => {
    if (left === 0 && !ok && !busy) onDone(link.code) // the dashboard's 2 minutes are over
  }, [left, ok, busy, link.code, onDone])

  async function confirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await officeClient.officeLinkConfirm(sessionToken, link.code)
      Vibration.vibrate(40)
      setOk(true)
      setTimeout(() => onDone(link.code), 1500)
    } catch (e) {
      setError(officeErrorText(e))
      progress.setValue(0)
    } finally {
      setBusy(false)
    }
  }

  function startHold(): void {
    if (busy || ok) return
    setError(null)
    Animated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) confirm().catch(() => undefined)
    })
  }
  function stopHold(): void {
    if (busy || ok) return
    progress.stopAnimation()
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start()
  }
  async function deny(): Promise<void> {
    progress.stopAnimation()
    await officeClient.officeLinkDeny(sessionToken, link.code).catch(() => undefined)
    onDone(link.code)
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  return (
    <Modal visible animationType="fade" onRequestClose={() => deny().catch(() => undefined)} statusBarTranslucent>
      <SafeAreaView style={styles.root}>
        <View style={styles.content}>
          <View style={styles.badge}>
            <Icon name={ok ? 'check' : 'lock'} size="lg" color={theme.colors.primary} />
          </View>
          <Text style={[theme.typography('headlineMd'), styles.title]}>{ok ? 'وارد شدید' : 'ورود به داشبورد دفتر'}</Text>
          <Text style={[theme.typography('bodyMd'), styles.body]}>
            {ok
              ? 'داشبورد دفتر در همان مرورگر باز می‌شود.'
              : 'کسی با شمارهٔ شما در داشبورد دفتر املاک وارد می‌شود. اگر خودتان هستید، دکمهٔ زیر را ۳ ثانیه نگه دارید.'}
          </Text>
          {!ok ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="نگه دارید تا وارد شوید"
                accessibilityHint="سه ثانیه نگه دارید"
                onPressIn={startHold}
                onPressOut={stopHold}
                disabled={busy}
                style={styles.hold}
              >
                <Animated.View style={[styles.fill, { width }]} />
                <Text style={[theme.typography('titleSm'), styles.holdText]}>{busy ? 'در حال بررسی…' : 'نگه دارید تا وارد شوید'}</Text>
              </Pressable>
              <Text style={[theme.typography('bodySm'), styles.note]}>
                {left > 0 ? `${faDigits(String(left))} ثانیه فرصت دارید` : 'زمان تمام شد'}
              </Text>
              {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
              <Button label="این ورود من نیست" variant="secondary" fullWidth disabled={busy} onPress={() => deny().catch(() => undefined)} />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

function secondsLeft(iso: string): number {
  return Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000))
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: theme.spacing.space6, gap: theme.spacing.space4, justifyContent: 'center' },
    badge: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center'
    },
    title: { color: theme.colors.onSurface, textAlign: 'center' }, // rtl-allow: headline under the centred badge
    body: { color: theme.colors.onSurfaceVariant, textAlign: 'center' }, // rtl-allow: one line under the centred headline
    hold: {
      height: 64,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.space4
    },
    fill: { position: 'absolute', top: 0, bottom: 0, start: 0, backgroundColor: theme.colors.primary, opacity: 0.35 },
    holdText: { color: theme.colors.onPrimaryContainer },
    note: { color: theme.colors.onSurfaceVariant, textAlign: 'center' }, // rtl-allow: under the centred button
    error: { color: theme.colors.error, textAlign: 'center' } // rtl-allow: under the centred button
  })
}
