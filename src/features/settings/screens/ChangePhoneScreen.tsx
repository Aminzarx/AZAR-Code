import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme, type Theme } from '@shared/theme'
import { Button, FormScreenContainer, Icon, OtpInput, TextInput } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import { AuthenticationFailureError, ValidationFailureError } from '@core/auth/errors'
import { canonicalizeIranPhoneNumber, formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { toEnglishDigits, toPersianDigits } from '@shared/utils/persianText'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { formatTokenAmount } from '../services/tokenLedger'

type Props = NativeStackScreenProps<MainStackParamList, 'ChangePhone'>

type Step = 'number' | 'code' | 'done'

const CODE_LENGTH = 6

function errorText(error: unknown): string {
  if (error instanceof ValidationFailureError) {
    switch (error.code) {
      case 'phone_already_registered':
        return 'این شماره همین حالا حساب ایوان دارد.'
      case 'same_phone_number':
        return 'این همان شمارهٔ فعلی شماست.'
      case 'invalid_otp':
        return 'کد درست نیست. دوباره نگاه کنید.'
      case 'otp_expired':
        return 'زمان کد تمام شده است. کد تازه بگیرید.'
      case 'phone_change_off':
        return 'تغییر شماره فعلاً فعال نیست.'
      case 'tokens_short':
        return 'توکن کافی برای تغییر شماره ندارید.'
      default:
        return 'شمارهٔ موبایل درست نیست.'
    }
  }
  if (error instanceof AuthenticationFailureError) {
    return 'برای تغییر شماره، یک بار از حساب خارج و دوباره وارد شوید.'
  }
  return 'به اینترنت وصل نیستید یا سرور پاسخ نداد. دوباره تلاش کنید.'
}

/** What the number change costs, from the token ledger: unknown (offline, the server decides), off, or a cost. */
type PhoneCost = { kind: 'unknown' } | { kind: 'off' } | { kind: 'cost'; tokens: number; balance: number }

/**
 * v1.5.0 (Amin #4632, «تغییر شماره»): the new number is proved with its own
 * code; then the account moves to it. The user's files, referral code and
 * invites stay; other phones signed in with the account are signed out, and
 * the old number can no longer be used to sign in.
 * Amin #5052: the change costs tokens (kss-pricing «اپلیکیشن‌ها»). The cost and the balance are shown first; while the
 * cost is empty the change is off, and a short balance cannot start it (no code is sent for nothing).
 */
export function ChangePhoneScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { sendOtp, verifyOtp, changePhone, getTokenLedger } = useAuth()
  const [cost, setCost] = useState<PhoneCost>({ kind: 'unknown' })
  const [step, setStep] = useState<Step>('number')
  const [input, setInput] = useState('')
  const [phone, setPhone] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<'default' | 'error' | 'success'>('default')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    getTokenLedger()
      .then((result) => {
        if (!live || !result) return
        const tokens = result.ledger.settings.phoneChangeTokens
        setCost(
          tokens == null ? { kind: 'off' } : { kind: 'cost', tokens, balance: result.ledger.summary.balance }
        )
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [getTokenLedger])

  const blocked = cost.kind === 'off' || (cost.kind === 'cost' && cost.balance < cost.tokens)

  async function handleSendCode(): Promise<void> {
    const canonical = canonicalizeIranPhoneNumber(toEnglishDigits(input))
    if (!canonical) {
      setError('شمارهٔ موبایل را مثل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.')
      return
    }
    setError(null)
    setIsBusy(true)
    try {
      await sendOtp(canonical)
      setPhone(canonical)
      setCode('')
      setCodeStatus('default')
      setStep('code')
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setIsBusy(false)
    }
  }

  async function confirm(value: string): Promise<void> {
    if (!phone) return
    setError(null)
    setIsBusy(true)
    try {
      await verifyOtp(phone, value)
      await changePhone(phone)
      setCodeStatus('success')
      setStep('done')
    } catch (caught) {
      setCodeStatus('error')
      setError(errorText(caught))
    } finally {
      setIsBusy(false)
    }
  }

  function handleCodeChange(next: string): void {
    setCode(next)
    setCodeStatus('default')
    setError(null)
    if (next.length === CODE_LENGTH && !isBusy) {
      confirm(next)
    }
  }

  const shownPhone = phone ? toPersianDigits(formatIranPhoneNumberForDisplay(phone)) : ''

  return (
    <FormScreenContainer
      headerTitle="تغییر شماره"
      onBack={() => navigation.goBack()}
      footer={
        step === 'number' ? (
          <Button
            label="ارسال کد به شمارهٔ تازه"
            onPress={handleSendCode}
            loading={isBusy}
            disabled={blocked || input.trim().length < 10}
          />
        ) : step === 'done' ? (
          <Button label="بازگشت به پروفایل" onPress={() => navigation.goBack()} />
        ) : undefined
      }
    >
      {step === 'number' ? (
        <>
          <View style={styles.notes}>
            <Note theme={theme} text="کد تأیید به شمارهٔ تازه فرستاده می‌شود." />
            <Note theme={theme} text="همهٔ فایل‌ها، متقاضیان و کد معرف شما سر جایش می‌ماند." />
            <Note theme={theme} text="پس از تغییر، با شمارهٔ قبلی دیگر نمی‌توان وارد شد و گوشی‌های دیگر از حساب خارج می‌شوند." />
          </View>
          {cost.kind === 'off' ? (
            <Text style={[theme.typography('bodyMd'), styles.costLine]}>تغییر شماره فعلاً فعال نیست.</Text>
          ) : cost.kind === 'cost' ? (
            <Text style={[theme.typography('bodyMd'), styles.costLine]}>
              {cost.balance < cost.tokens
                ? `تغییر شماره ${formatTokenAmount(cost.tokens)} توکن است و موجودی شما ${formatTokenAmount(cost.balance)} توکن؛ کافی نیست.`
                : `هزینهٔ تغییر شماره: ${formatTokenAmount(cost.tokens)} توکن (موجودی: ${formatTokenAmount(cost.balance)} توکن)`}
            </Text>
          ) : null}
          <TextInput
            label="شمارهٔ موبایل تازه"
            required
            value={input}
            onChangeText={(text) => {
              setInput(text)
              setError(null)
            }}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            keyboardType="phone-pad"
            maxLength={14}
            errorMessage={error ?? undefined}
            autoFocus
          />
        </>
      ) : step === 'code' ? (
        <View style={styles.codeBlock}>
          <Text style={[theme.typography('bodyMd'), styles.lead]}>
            {`کد ۶ رقمی فرستاده‌شده به ${shownPhone} را وارد کنید.`}
          </Text>
          <OtpInput value={code} onChangeValue={handleCodeChange} status={codeStatus} disabled={isBusy} autoFocus />
          {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
          <Button
            label="شمارهٔ دیگری وارد می‌کنم"
            variant="text"
            onPress={() => {
              setStep('number')
              setError(null)
            }}
          />
        </View>
      ) : (
        <View style={styles.doneBlock}>
          <View style={styles.doneIcon}>
            <Icon name="check" size="lg" color={theme.colors.onPrimary} />
          </View>
          <Text style={[theme.typography('titleMd'), styles.doneTitle]}>شماره تغییر کرد</Text>
          <Text style={[theme.typography('bodyMd'), styles.lead]}>
            {`از این پس با ${shownPhone} وارد شوید.`}
          </Text>
        </View>
      )}
    </FormScreenContainer>
  )
}

function Note({ theme, text }: { theme: Theme; text: string }): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.space2, alignItems: 'flex-start' }}>
      <Icon name="check" size="xs" color={theme.colors.success} />
      <Text style={[theme.typography('bodySm'), { flex: 1, color: theme.colors.onSurfaceVariant }]}>{text}</Text>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    notes: {
      gap: theme.spacing.space2,
      padding: theme.spacing.space4,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLow
    },
    costLine: { color: theme.colors.onSurface, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    codeBlock: { gap: theme.spacing.space4, alignItems: 'stretch' },
    lead: { color: theme.colors.onSurfaceVariant, textAlign: 'center' }, // rtl-allow: lead line above the centred code boxes
    error: { color: theme.colors.error, textAlign: 'center' }, // rtl-allow: error under the centred code boxes
    doneBlock: { alignItems: 'center', gap: theme.spacing.space3, paddingTop: theme.spacing.space8 },
    doneIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.success,
      alignItems: 'center',
      justifyContent: 'center'
    },
    doneTitle: { color: theme.colors.onSurface, textAlign: 'center' } // rtl-allow: centred success block
  })
}
