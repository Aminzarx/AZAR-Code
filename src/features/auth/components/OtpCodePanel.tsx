import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { OtpInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { toPersianDigits } from '@shared/utils/persianText'
import { listenForSmsCode } from '@infrastructure/sms/smsCodeReader'

type Props = {
  phoneNumber: string
  /** A number with no account yet goes on to the referral-code step. */
  onNeedsReferral: (phoneNumber: string) => void
  autoFocus?: boolean
}

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 120

type Status = 'default' | 'error' | 'success'

function formatCooldown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return toPersianDigits(`${minutes}:${seconds.toString().padStart(2, '0')}`)
}

/**
 * v3.0.0 (Amin #4205): the code entry, shared by the one-page sign-in
 * (PhoneEntryScreen) and the older OtpVerification route.
 */
export function OtpCodePanel({
  phoneNumber,
  onNeedsReferral,
  autoFocus
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { sendOtp, verifyOtp, login } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('default')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(RESEND_COOLDOWN_SECONDS)
  const [isResending, setIsResending] = useState(false)
  // Bumped on «ارسال مجدد کد» so the SMS reader waits for the new message.
  const [smsRound, setSmsRound] = useState(0)
  const onSmsCode = useRef<(code: string) => void>(() => undefined)

  // v1.2.0 (Amin #4229): the code fills in from the SMS after one «allow» tap.
  useEffect(
    () => listenForSmsCode(CODE_LENGTH, (smsCode) => onSmsCode.current(smsCode)),
    [smsRound]
  )

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
      setSmsRound((round) => round + 1)
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
        onNeedsReferral(phoneNumber)
        return
      }
      if (caughtError instanceof ValidationFailureError && caughtError.code === 'phone_moved') {
        // v1.5.0 (Amin #4632): this account moved to a new number
        setStatus('error')
        setError('این حساب به شمارهٔ دیگری منتقل شده است؛ با شمارهٔ تازه وارد شوید.')
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
  onSmsCode.current = (smsCode) => {
    if (status !== 'success' && !isSubmitting) {
      handleChangeValue(smsCode)
    }
  }

  return (
    <View style={styles.form}>
      <OtpInput
        value={code}
        onChangeValue={handleChangeValue}
        status={status}
        disabled={isSubmitting || status === 'success'}
        onSuccessAnimationComplete={handleVerified}
        autoFocus={autoFocus}
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
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
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
