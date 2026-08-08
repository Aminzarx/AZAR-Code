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

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>

export function PhoneEntryScreen({ navigation }: Props): React.JSX.Element {
  const { sendOtp } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    setError(null)
    setIsSubmitting(true)
    try {
      await sendOtp(phoneNumber)
      navigation.navigate('OtpVerification', { phoneNumber })
    } catch (caughtError) {
      if (caughtError instanceof ValidationFailureError) {
        setError(caughtError.message)
      } else {
        setError('ارسال کد تأیید با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>شماره موبایل خود را وارد کنید</Text>
          <Text style={styles.subtitle}>یک کد تأیید برای شما پیامک می‌شود.</Text>
        </View>
        <View style={styles.form}>
          <AuthTextField
            label="شماره موبایل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+989121234567"
            keyboardType="phone-pad"
            errorMessage={error ?? undefined}
            autoFocus
          />
          <PrimaryButton
            label="دریافت کد تأیید"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={phoneNumber.length < 8}
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
