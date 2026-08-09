import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { OtpInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>

const CODE_LENGTH = 6

type Status = 'default' | 'error' | 'success'

export function OtpVerificationScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { phoneNumber } = route.params
  const { verifyOtp } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('default')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
          کد ارسال‌شده به {phoneNumber} را وارد کنید.
        </Text>
      </View>
      <View style={styles.form}>
        <OtpInput
          value={code}
          onChangeValue={handleChangeValue}
          status={status}
          disabled={isSubmitting || status === 'success'}
          onSuccessAnimationComplete={() => navigation.navigate('ReferralCode', { phoneNumber })}
        />
        {error ? <Text style={[theme.typography('bodySm'), styles.errorText]}>{error}</Text> : null}
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
    headerTitle: {
      color: theme.colors.primary
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant
    },
    form: {
      gap: theme.spacing.space3
    },
    errorText: {
      color: theme.colors.error
    }
  })
}
