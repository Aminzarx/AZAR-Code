import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { OtpInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { toPersianDigits } from '@shared/utils/persianText'

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 120

type Status = 'default' | 'error' | 'success'

function formatCooldown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return toPersianDigits(`${minutes}:${seconds.toString().padStart(2, '0')}`)
}

export function OtpVerificationScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { phoneNumber } = route.params
  const { sendOtp, verifyOtp, login } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('default')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(RESEND_COOLDOWN_SECONDS)
  const [isResending, setIsResending] = useState(false)

  // Prevents requesting a fresh code back-to-back (rate-limit-friendly on
  // the server side too, but this is the user-facing reason for it).
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return
    }
    const timer = setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  async function handleResend(): Promise<void> {
    setIsResending(true)
    try {
      await sendOtp(phoneNumber)
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
      setCode('')
      setStatus('default')
      setError(null)
    } catch {
      setError('ارسال مجدد کد با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsResending(false)
    }
  }

  async function submit(candidate: string): Promise<void> {
    setError(null)
    setIsSubmitting(true)
    try {
      await verifyOtp(phoneNumber, candidate)
      // Navigation happens once OtpInput's left-to-right success sweep
      // finishes (onSuccessAnimationComplete below), not immediately —
      // the confirmation itself is part of the expected flow.
      setStatus('success')
    } catch (caughtError) {
      setStatus('error')
      if (caughtError instanceof ValidationFailureError) {
        setError(caughtError.message)
      } else {
        setError('تأیید کد با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // A phone number that already has an account should never be asked for a
  // referral code again — that's only for the very first registration. This
  // tries to log the number in directly; only a genuine "no account for
  // this number" result falls through to the ReferralCode/register screen.
  // login() requires the same server-side OTP-verified state verifyOtp()
  // above just set, so this reuses it rather than asking again.
  async function handleVerified(): Promise<void> {
    try {
      await login(phoneNumber)
    } catch (caughtError) {
      if (
        caughtError instanceof ValidationFailureError &&
        caughtError.code === 'invalid_phone_number'
      ) {
        navigation.navigate('ReferralCode', { phoneNumber })
        return
      }
      setStatus('error')
      setError('ورود با مشکل مواجه شد. دوباره تلاش کنید.')
    }
  }

  function handleChangeValue(next: string): void {
    setCode(next)
    setStatus('default')
    setError(null)
    if (next.length === CODE_LENGTH && !isSubmitting) {
      submit(next)
    }
  }

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>کد تأیید را وارد کنید</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          کد ارسال‌شده به {formatIranPhoneNumberForDisplay(phoneNumber)} را وارد کنید.
        </Text>
      </View>
      <View style={styles.form}>
        <OtpInput
          value={code}
          onChangeValue={handleChangeValue}
          status={status}
          disabled={isSubmitting || status === 'success'}
          onSuccessAnimationComplete={handleVerified}
        />
        {error ? <Text style={[theme.typography('bodySm'), styles.errorText]}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ارسال مجدد کد"
          onPress={handleResend}
          disabled={cooldownSeconds > 0 || isResending}
          style={styles.resendRow}
        >
          <Text
            style={[
              theme.typography('labelMd'),
              cooldownSeconds > 0 ? styles.resendTextDisabled : styles.resendText
            ]}
          >
            {cooldownSeconds > 0
              ? `ارسال مجدد کد تا ${formatCooldown(cooldownSeconds)} دیگر`
              : 'ارسال مجدد کد'}
          </Text>
        </Pressable>
      </View>
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      gap: theme.spacing.space2,
      marginBottom: theme.spacing.space8
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    headerTitle: {
      color: theme.colors.primary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    form: {
      gap: theme.spacing.space3
    },
    errorText: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    resendRow: {
      alignSelf: 'center',
      minHeight: theme.touchTargetMinimum,
      justifyContent: 'center',
      marginTop: theme.spacing.space2
    },
    resendText: {
      color: theme.colors.primary
    },
    resendTextDisabled: {
      color: theme.colors.onSurfaceVariant
    }
  })
}
