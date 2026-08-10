import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

type Props = NativeStackScreenProps<AuthStackParamList, 'ReferralCode'>

export function ReferralCodeScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
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
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>کد معرف</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          برای تکمیل ثبت‌نام، کد معرفِ فرد دعوت‌کننده را وارد کنید.
        </Text>
      </View>
      <View style={styles.form}>
        <TextInput
          label="کد معرف"
          value={referralCode}
          onChangeText={setReferralCode}
          placeholder="ABCD1234"
          maxLength={8}
          errorMessage={error ?? undefined}
          autoFocus
        />
        <Button
          label="تکمیل ثبت‌نام"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={referralCode.length < 8}
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
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    },
    form: {
      gap: theme.spacing.space6
    }
  })
}
