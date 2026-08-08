import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { AuthTextField } from '@shared/components/AuthTextField'
import { PrimaryButton } from '@shared/components/PrimaryButton'
import { ValidationFailureError } from '@core/auth/errors'
import { colors, spacing, typography } from '@shared/tokens'

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>

export function OtpVerificationScreen({ navigation, route }: Props): React.JSX.Element {
  const { phoneNumber } = route.params
  const { verifyOtp } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    setError(null)
    setIsSubmitting(true)
    try {
      await verifyOtp(phoneNumber, code)
      navigation.navigate('ReferralCode', { phoneNumber })
    } catch (caughtError) {
      if (caughtError instanceof ValidationFailureError) {
        setError(caughtError.message)
      } else {
        setError('تأیید کد با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>کد تأیید را وارد کنید</Text>
          <Text style={styles.subtitle}>کد ارسال‌شده به {phoneNumber} را وارد کنید.</Text>
        </View>
        <View style={styles.form}>
          <AuthTextField
            label="کد تأیید"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            errorMessage={error ?? undefined}
            autoFocus
          />
          <PrimaryButton
            label="تأیید کد"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={code.length < 4}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    padding: spacing.space6,
    gap: spacing.space8
  },
  header: {
    gap: spacing.space2
  },
  title: {
    fontSize: typography.titleMd.fontSize,
    fontWeight: typography.titleMd.fontWeight,
    lineHeight: typography.titleMd.lineHeight,
    color: colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  subtitle: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  form: {
    gap: spacing.space6
  }
})
