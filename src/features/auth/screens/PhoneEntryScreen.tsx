import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { validationText } from '@features/auth/validationText'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'
import { OtpCodePanel } from '@features/auth/components/OtpCodePanel'
import { BrandMark } from '@features/auth/components/BrandMark'
import { canonicalizeIranPhoneNumber } from '@shared/utils/iranPhoneNumber'

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>

/**
 * v3.0.0 (Amin #4180/#4205): sign-in on one page. Once the code is sent the
 * number is locked and only «ویرایش شماره» is active; tapping it drops the
 * code that was sent and unlocks the number for a new one.
 */
export function PhoneEntryScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { sendOtp } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
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
      setSentTo(canonicalPhoneNumber)
    } catch (caughtError) {
      if (caughtError instanceof ValidationFailureError) {
        setError(validationText(caughtError))
      } else {
        setError('ارسال کد تأیید با مشکل مواجه شد. دوباره تلاش کنید.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEditNumber(): void {
    setSentTo(null)
    setError(null)
  }

  return (
    <AuthScreenContainer>
      <BrandMark />
      <View style={styles.header}>
        <Text style={[theme.typography('headlineLgMobile'), styles.headerTitle]}>
          ورود با شماره موبایل
        </Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          رمز لازم نیست؛ یک کد تأیید برای شما پیامک می‌شود.
        </Text>
      </View>
      <View style={styles.form}>
        <View style={styles.phoneGroup}>
          <TextInput
            label="شماره موبایل"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="09121234567"
            keyboardType="phone-pad"
            errorMessage={error ?? undefined}
            disabled={sentTo !== null}
            autoFocus
          />
          {sentTo ? (
            <View style={styles.sentRow}>
              <Text style={[theme.typography('bodySm'), styles.sentNote]}>
                کد ۶ رقمی به این شماره پیامک شد.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ویرایش شماره"
                onPress={handleEditNumber}
                hitSlop={8}
                style={styles.editButton}
              >
                <Text style={[theme.typography('labelMd'), styles.editText]}>ویرایش شماره</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        {sentTo ? (
          <OtpCodePanel
            key={sentTo}
            phoneNumber={sentTo}
            onNeedsReferral={(phone) => navigation.navigate('ReferralCode', { phoneNumber: phone })}
            autoFocus
          />
        ) : (
          <Button
            label="دریافت کد تأیید"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={phoneNumber.length < 8}
          />
        )}
      </View>
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      gap: theme.spacing.space2,
      marginBottom: theme.spacing.space6
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    headerTitle: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    form: {
      gap: theme.spacing.space6
    },
    phoneGroup: {
      gap: theme.spacing.space2
    },
    sentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    sentNote: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1
    },
    editButton: {
      minHeight: theme.touchTargetMinimum,
      justifyContent: 'center'
    },
    editText: {
      color: theme.colors.primary
    }
  })
}
