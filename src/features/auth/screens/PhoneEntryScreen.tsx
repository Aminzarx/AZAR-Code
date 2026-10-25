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

/** Amin #5302: exactly 11 digits, 09xxxxxxxxx; Persian and Arabic digits count, anything else is dropped */
const LOCAL_MOBILE = /^09\d{9}$/
function localMobileDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '')
    .slice(0, 11)
}

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
      {/* Amin #5301: only the number field, its label and the button */}
      <View style={styles.form}>
        <View style={styles.phoneGroup}>
          <TextInput
            label="لطفا شماره خود را وارد کنید"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(localMobileDigits(text))}
            maxLength={11}
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
            disabled={!LOCAL_MOBILE.test(phoneNumber)}
          />
        )}
      </View>
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
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
