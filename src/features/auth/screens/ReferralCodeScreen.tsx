import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon, QrCodeScanner, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { validationText } from '@features/auth/validationText'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'
import { LOCAL_MOBILE, localMobileDigits } from './PhoneEntryScreen'

/**
 * Amin #5563: one field takes the inviter's code OR the inviter's mobile (09…). Digits first (Persian or English)
 * make it a mobile number; anything else is a code (upper-cased).
 */
export function inviterEntry(text: string): { kind: 'mobile' | 'code'; value: string } {
  const trimmed = text.trim()
  if (/^[0-9۰-۹٠-٩+]/.test(trimmed)) {
    const digits = localMobileDigits(trimmed.replace(/^(\+98|0098)/, '0'))
    return { kind: 'mobile', value: digits }
  }
  return { kind: 'code', value: trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }
}

type Props = NativeStackScreenProps<AuthStackParamList, 'ReferralCode'>

export function ReferralCodeScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  // Amin #5348: the name was asked on the page before
  const { phoneNumber, displayName, agencyName } = route.params
  const { register } = useAuth()
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScannerVisible, setIsScannerVisible] = useState(false)

  // Amin #5563: nothing is filled in by itself (the clipboard used to fill a code — Amin's own code ended up as a new
  // member's referrer); the new member types the code or the inviter's mobile, or scans the inviter's QR
  // Auto-fills the field from the QR — the real check against the
  // database happens exactly where it already did for manual entry, in
  // handleSubmit's register() call (ValidationFailureError('invalid_referral_code')).
  function handleScan(value: string): void {
    setIsScannerVisible(false)
    setReferralCode(value.trim().toUpperCase().slice(0, 8))
    setError(null)
  }

  // The normal generated code is 8 characters, but the mother referral code (AMINZX) is only 6 — this only guards
  // against an obviously-incomplete entry, not a fixed length.
  const entry = inviterEntry(referralCode)
  const canSubmit = entry.kind === 'mobile' ? LOCAL_MOBILE.test(entry.value) : entry.value.length >= 6

  async function handleSubmit(): Promise<void> {
    if (entry.kind === 'mobile' && entry.value.slice(1) === phoneNumber.replace(/\D/g, '').slice(-10)) {
      setError('شمارهٔ خودتان را نمی‌توانید وارد کنید.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      // No explicit navigation on success: RootNavigator swaps from
      // AuthNavigator to MainNavigator as soon as useAuth().session is
      // set (register() below sets it) — see navigation/RootNavigator.tsx.
      // the name and agency are saved by register() once the phone holds this account's files
      // the server tells a mobile (09…) from a code (#5344)
      await register(phoneNumber, entry.value, { displayName, agencyName })
    } catch (caughtError) {
      if (caughtError instanceof ValidationFailureError) {
        setError(validationText(caughtError))
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
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>تکمیل ثبت‌نام</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          فقط یک بار؛ بعد مستقیم وارد برنامه می‌شوید.
        </Text>
      </View>
      <View style={styles.form}>
        <TextInput
          label="کد معرف یا شمارهٔ موبایل معرف"
          value={referralCode}
          onChangeText={(text) => {
            setReferralCode(text)
            setError(null)
          }}
          placeholder="ABCD1234 یا 09121234567"
          maxLength={13}
          errorMessage={error ?? undefined}
          returnKeyType="done"
          onSubmitEditing={() => {
            // the keyboard can cover the button on a small screen; its ✓ sends the form when it is complete
            if (canSubmit && !isSubmitting) handleSubmit()
          }}
        />
        <Text style={[theme.typography('bodySm'), styles.codeHint]}>
          کد معرف یا شمارهٔ موبایل کسی را که شما را دعوت کرده بنویسید، یا بارکد او را اسکن کنید.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="اسکن بارکد کد معرف"
          onPress={() => setIsScannerVisible(true)}
          style={styles.scanButton}
        >
          <Icon name="scan" size="xs" color={theme.colors.secondary} />
          <Text style={[theme.typography('labelMd'), styles.scanButtonLabel]}>اسکن بارکد</Text>
        </Pressable>
        <Button
          label="ورود به برنامه"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
        />
      </View>

      <QrCodeScanner
        visible={isScannerVisible}
        title="اسکن بارکد کد معرف"
        onScan={handleScan}
        onClose={() => setIsScannerVisible(false)}
      />
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
      gap: theme.spacing.space5
    },
    codeHint: {
      color: theme.colors.onSurfaceVariant,
      marginTop: -theme.spacing.space3
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.space2,
      minHeight: theme.touchTargetMinimum,
      marginTop: -theme.spacing.space4
    },
    scanButtonLabel: {
      color: theme.colors.secondary
    },
  })
}
