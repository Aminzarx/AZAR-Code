import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

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
          placeholder="+989121234567"
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
    headerTitle: {
      color: theme.colors.primary
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant
    },
    form: {
      gap: theme.spacing.space6
    }
  })
}
