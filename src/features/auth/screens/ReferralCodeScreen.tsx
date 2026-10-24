import React, { useEffect, useState } from 'react'
import { Clipboard, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon, QrCodeScanner, TextInput } from '@shared/components'
import { ValidationFailureError } from '@core/auth/errors'
import { validationText } from '@features/auth/validationText'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

/** a referral code as minted (8) or the mother code (6) — no 0/O/1/I/L */
const CODE_SHAPE = /^[A-HJ-NP-Z2-9]{6,8}$/

type Props = NativeStackScreenProps<AuthStackParamList, 'ReferralCode'>

export function ReferralCodeScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { phoneNumber } = route.params
  const { register } = useAuth()
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScannerVisible, setIsScannerVisible] = useState(false)
  const [fullName, setFullName] = useState('')
  const [agency, setAgency] = useState('')
  const [fromInvite, setFromInvite] = useState(false)

  // v1.4.0 (Amin #4311): the invite page copies the inviter's code; if it
  // is on the clipboard, it is filled in here so nothing has to be typed.
  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => Clipboard.getString())
      .then((text) => {
        const candidate = typeof text === 'string' ? text.trim().toUpperCase() : ''
        if (!cancelled && CODE_SHAPE.test(candidate)) {
          setReferralCode((current) => (current ? current : candidate))
          setFromInvite(true)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-fills the field from the QR — the real check against the
  // database happens exactly where it already did for manual entry, in
  // handleSubmit's register() call (ValidationFailureError('invalid_referral_code')).
  function handleScan(value: string): void {
    setIsScannerVisible(false)
    setReferralCode(value.trim().toUpperCase().slice(0, 8))
    setError(null)
  }

  async function handleSubmit(): Promise<void> {
    setError(null)
    setIsSubmitting(true)
    try {
      // No explicit navigation on success: RootNavigator swaps from
      // AuthNavigator to MainNavigator as soon as useAuth().session is
      // set (register() below sets it) — see navigation/RootNavigator.tsx.
      // the name and agency are saved by register() once the phone holds this account's files
      await register(phoneNumber, referralCode.toUpperCase(), {
        displayName: fullName.trim() || undefined,
        agencyName: agency.trim() || undefined
      })
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
          label="نام و نام خانوادگی *"
          value={fullName}
          onChangeText={setFullName}
          placeholder="مثلاً علی رضایی"
        />
        <TextInput
          label="نام مشاور املاک (اختیاری)"
          value={agency}
          onChangeText={setAgency}
          placeholder="مثلاً املاک پارسه"
        />
        <TextInput
          label="کد معرف"
          value={referralCode}
          onChangeText={(text) => {
            setReferralCode(text)
            setFromInvite(false)
          }}
          placeholder="ABCD1234"
          maxLength={8}
          errorMessage={error ?? undefined}
        />
        <Text style={[theme.typography('bodySm'), styles.codeHint]}>
          کد را از کسی که شما را دعوت کرده بگیرید یا بارکد او را اسکن کنید.
        </Text>
        {fromInvite ? (
          <Text style={[theme.typography('bodySm'), styles.inviteHint]}>
            کد معرف از پیوند دعوت برداشته شد.
          </Text>
        ) : null}
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
          // The normal generated code is 8 characters, but the mother
          // referral code (AMINZX) is only 6 — this only guards against an
          // obviously-incomplete entry, not a fixed length.
          disabled={referralCode.length < 6 || fullName.trim().length < 2}
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
    inviteHint: {
      color: theme.colors.success,
      marginTop: -theme.spacing.space3,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
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
    }
  })
}
