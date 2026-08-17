import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'
import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>

export function PhoneEntryScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { sendOtp } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(): Promise<void> {
    setError(null)
    // Iranian mobile numbers are entered locally (09121234567) — the
    // backend/mock API stores and keys OTP state on the canonical
    // +989121234567 form, so that conversion happens once, here, rather
    // than requiring the user to type the +98 prefix themselves.
    const canonicalPhoneNumber = canonicalizeIranPhoneNumber(phoneNumber)
    if (!canonicalPhoneNumber) {
      setError('شماره موبایل معتبر نیست. مثال: 09121234567')
      return
    }
    setIsSubmitting(true)
    try {
      await sendOtp(canonicalPhoneNumber)
      navigation.navigate('OtpVerification', { phoneNumber: canonicalPhoneNumber })
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
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>
          شماره موبایل خود را وارد کنید
        </Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          یک کد تأیید برای شما پیامک می‌شود.
        </Text>
      </View>
      <View style={styles.form}>
        <TextInput
          label="شماره موبایل"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="09121234567"
          keyboardType="phone-pad"
          errorMessage={error ?? undefined}
          autoFocus
        />
        <Button
          label="دریافت کد تأیید"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={phoneNumber.length < 8}
        />
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
      gap: theme.spacing.space6
    }
  })
}
