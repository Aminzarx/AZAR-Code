import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Switch, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ConfirmDialog, FormScreenContainer, LoadingIndicator, TextInput } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import type { OfficeStatus } from '@infrastructure/sync/syncApiClient'
import {
  OFFICE_REQUEST_CONFIRM_TEXT,
  loadOfficeStatus,
  notePortal,
  officeClient,
  officeErrorText
} from '../services/officePanel'

type Props = NativeStackScreenProps<MainStackParamList, 'OfficePanel'>

const toLatin = (v: string) => v.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const USERNAME = /^[a-z0-9_.]{4,32}$/
const PASSWORD_MIN = 8

/**
 * Amin #5970/#6032/#6034: «پنل دفتر املاک» — asking for the office panel. Office address (required), union licence,
 * landline (optional, with its area code) and the panel's own username + password (the panel only). One request at
 * a time: once sent, «ارسال درخواست» becomes «لغو درخواست». Sales management approves; the app then gives way to the
 * panel (useOfficePortal), with the phone's files kept.
 */
export function OfficePanelScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const token = session?.sessionToken
  const [status, setStatus] = useState<OfficeStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [unionLicence, setUnionLicence] = useState(false)
  const [landline, setLandline] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [asking, setAsking] = useState<'send' | 'cancel' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoadError(null)
    try {
      setStatus(await loadOfficeStatus(token))
    } catch (e) {
      setLoadError(officeErrorText(e))
    }
  }, [token])
  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const line = toLatin(landline).replace(/\D/g, '')
  const user = toLatin(username).trim().toLowerCase()
  const problems = {
    address: address.trim() ? undefined : 'آدرس دفتر را بنویسید.',
    landline: !line || /^0\d{10}$/.test(line) ? undefined : 'شمارهٔ ثابت را با پیش‌شماره بنویسید؛ مثل ۰۲۱۸۸۷۷۶۶۵۵.',
    username: USERNAME.test(user) ? undefined : 'نام کاربری ۴ تا ۳۲ حرف انگلیسی، عدد، نقطه یا _ باشد.',
    password: password.length >= PASSWORD_MIN ? undefined : 'رمز دست‌کم ۸ حرف باشد.'
  }
  const [touched, setTouched] = useState(false)
  const ready = !Object.values(problems).some(Boolean)

  async function act(kind: 'send' | 'cancel'): Promise<void> {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const next =
        kind === 'send'
          ? await officeClient.officeRequest(token, { address: address.trim(), unionLicence, landline: line, username: user, password })
          : await officeClient.officeCancel(token)
      setStatus(next)
      notePortal(next.portal)
      if (kind === 'send') setPassword('')
    } catch (e) {
      setError(officeErrorText(e))
    } finally {
      setBusy(false)
      setAsking(null)
    }
  }

  const request = status?.request ?? null
  const pending = request?.status === 'pending'
  const ended = request?.status === 'approved' && !!request.endedAt
  const showForm = status !== null && !pending && (request?.status !== 'approved' || ended)

  return (
    <FormScreenContainer headerTitle="پنل دفتر املاک" onBack={() => navigation.goBack()}>
      <Text style={[theme.typography('bodyMd'), styles.lead]}>
        با پنل دفتر املاک، فایل‌های دفتر و کار مشاوران را در وب، در پنل کاربری kssx.ir، مدیریت می‌کنید. پنل پس از بررسی
        درخواست شما فعال می‌شود.
      </Text>

      {status === null ? (
        loadError ? (
          <View style={styles.card}>
            <Text style={[theme.typography('bodyMd'), styles.error]}>{loadError}</Text>
            <Button label="دوباره" variant="secondary" onPress={() => load().catch(() => undefined)} />
          </View>
        ) : (
          <LoadingIndicator />
        )
      ) : null}

      {pending && request ? (
        <View style={styles.card}>
          <Text style={[theme.typography('titleSm'), styles.title]}>درخواست شما در حال بررسی است</Text>
          <Text style={[theme.typography('bodySm'), styles.note]}>آدرس دفتر: {request.address}</Text>
          {request.username ? (
            <Text style={[theme.typography('bodySm'), styles.note]}>نام کاربری پنل: {request.username}</Text>
          ) : null}
          <Text style={[theme.typography('bodySm'), styles.note]}>
            پس از تأیید، برنامه به پنل دفتر راهنمایی‌تان می‌کند و فایل‌هایتان سر جایشان می‌مانند.
          </Text>
          {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
          <Button label="لغو درخواست" variant="destructive" loading={busy} onPress={() => setAsking('cancel')} />
        </View>
      ) : null}

      {showForm ? (
        <View style={styles.form}>
          {ended ? (
            <Text style={[theme.typography('bodyMd'), styles.notice]}>
              پنل دفتر شما خاموش شد و برنامه دوباره کار می‌کند؛ هر وقت خواستید دوباره درخواست بدهید.
            </Text>
          ) : null}
          {request?.status === 'rejected' ? (
            <Text style={[theme.typography('bodyMd'), styles.notice]}>
              درخواست قبلی شما تأیید نشد؛ می‌توانید دوباره درخواست بدهید.
            </Text>
          ) : null}
          <TextInput
            label="آدرس دفتر"
            required
            multiline
            value={address}
            onChangeText={setAddress}
            errorMessage={touched ? problems.address : undefined}
            maxLength={300}
          />
          <View style={styles.switchRow}>
            <Text style={[theme.typography('bodyMd'), styles.switchLabel]}>جواز اتحادیه دارم</Text>
            <Switch
              accessibilityLabel="جواز اتحادیه دارم"
              value={unionLicence}
              onValueChange={setUnionLicence}
              trackColor={{ true: theme.colors.primary, false: theme.colors.outlineVariant }}
            />
          </View>
          <TextInput
            label="تلفن ثابت دفتر"
            placeholder="۰۲۱۸۸۷۷۶۶۵۵"
            keyboardType="phone-pad"
            value={landline}
            onChangeText={setLandline}
            errorMessage={touched ? problems.landline : undefined}
            helperText="اختیاری، با پیش‌شماره"
            maxLength={14}
          />
          <Text style={[theme.typography('titleSm'), styles.title]}>ورود به پنل دفتر</Text>
          <Text style={[theme.typography('bodySm'), styles.note]}>
            این نام کاربری و رمز فقط برای ورود به پنل دفتر است.
          </Text>
          <TextInput
            label="نام کاربری"
            required
            placeholder="parse_office"
            value={username}
            onChangeText={setUsername}
            errorMessage={touched ? problems.username : undefined}
            maxLength={32}
          />
          <TextInput
            label="رمز"
            required
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            errorMessage={touched ? problems.password : undefined}
            helperText="دست‌کم ۸ حرف"
            maxLength={128}
          />
          {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
          <Button
            label="ارسال درخواست"
            loading={busy}
            onPress={() => {
              setTouched(true)
              if (ready) setAsking('send')
            }}
          />
        </View>
      ) : null}

      <ConfirmDialog
        visible={asking !== null}
        title={asking === 'cancel' ? 'لغو درخواست' : 'درخواست پنل دفتر املاک'}
        description={asking === 'cancel' ? 'درخواست پنل دفتر املاک لغو شود؟' : OFFICE_REQUEST_CONFIRM_TEXT}
        confirmLabel={asking === 'cancel' ? 'لغو درخواست' : 'ارسال درخواست'}
        cancelLabel="انصراف"
        isConfirming={busy}
        onConfirm={() => {
          if (asking) act(asking).catch(() => undefined)
        }}
        onCancel={() => setAsking(null)}
      />
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    lead: { color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.space4, alignSelf: start },
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space3,
      marginBottom: theme.spacing.space4
    },
    form: { gap: theme.spacing.space3, marginBottom: theme.spacing.space6 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.space3 },
    switchLabel: { color: theme.colors.onSurface, flex: 1 },
    title: { color: theme.colors.onSurface, alignSelf: start },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    notice: { color: theme.colors.onSurface, alignSelf: start },
    error: { color: theme.colors.error, alignSelf: start }
  })
}
