import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { validationText } from '@features/auth/validationText'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'
import { LOCAL_MOBILE, localMobileDigits } from './PhoneEntryScreen'

type Props = NativeStackScreenProps<AuthStackParamList, 'InviterPhone'>

/**
 * Amin #5344: no invite code? The new member writes the mobile number of the colleague who invited them; the server
 * finds that member and the sign-up completes as with the code.
 */
export function InviterPhoneScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { phoneNumber, displayName, agencyName } = route.params
  const { register } = useAuth()
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canSubmit = LOCAL_MOBILE.test(mobile) && !isSubmitting

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return
    if (mobile.slice(1) === phoneNumber.replace(/\D/g, '').slice(-10)) {
      setError('شمارهٔ خودتان را نمی‌توانید وارد کنید.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      // RootNavigator moves to the app as soon as register() sets the session
      await register(phoneNumber, mobile, { displayName, agencyName })
    } catch (caughtError) {
      setError(
        caughtError instanceof ValidationFailureError
          ? validationText(caughtError)
          : 'ثبت‌نام با مشکل مواجه شد. دوباره تلاش کنید.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>شمارهٔ دعوت‌کننده</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          شمارهٔ موبایل همکاری را بنویسید که شما را به ایوان دعوت کرده است.
        </Text>
      </View>
      <View style={styles.form}>
        <TextInput
          label="شمارهٔ موبایل دعوت‌کننده"
          value={mobile}
          onChangeText={(text) => {
            setMobile(localMobileDigits(text))
            setError(null)
          }}
          maxLength={11}
          placeholder="09121234567"
          keyboardType="phone-pad"
          errorMessage={error ?? undefined}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <Button label="ورود به برنامه" onPress={handleSubmit} loading={isSubmitting} disabled={!LOCAL_MOBILE.test(mobile)} />
      </View>
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space8 },
    headerTitle: { color: theme.colors.primary, alignSelf: start },
    headerSubtitle: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    form: { gap: theme.spacing.space5 }
  })
}
