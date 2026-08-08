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

type Props = NativeStackScreenProps<AuthStackParamList, 'ReferralCode'>

export function ReferralCodeScreen({ route }: Props): React.JSX.Element {
  const { phoneNumber } = route.params
  const { register } = useAuth()
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    setError(null)
    setIsSubmitting(true)
    try {
      // No explicit navigation on success: RootNavigator swaps from
      // AuthNavigator to MainNavigator as soon as useAuth().session is
      // set (register() below sets it) — see navigation/RootNavigator.tsx.
      await register(phoneNumber, referralCode.toUpperCase())
    } catch (caughtError) {
      if (caughtError instanceof ValidationFailureError) {
        setError(caughtError.message)
      } else {
        setError('ثبت‌نام با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>کد معرف</Text>
          <Text style={styles.subtitle}>
            برای تکمیل ثبت‌نام، کد معرفِ فرد دعوت‌کننده را وارد کنید.
          </Text>
        </View>
        <View style={styles.form}>
          <AuthTextField
            label="کد معرف"
            value={referralCode}
            onChangeText={setReferralCode}
            placeholder="ABCD1234"
            maxLength={8}
            errorMessage={error ?? undefined}
            autoFocus
          />
          <PrimaryButton
            label="تکمیل ثبت‌نام"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={referralCode.length < 8}
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
