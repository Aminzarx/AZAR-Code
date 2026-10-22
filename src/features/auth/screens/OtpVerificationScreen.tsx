import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'
import { OtpCodePanel } from '@features/auth/components/OtpCodePanel'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>

/** v3.0.0: sign-in is one page now (PhoneEntryScreen); this route stays for old deep links. */
export function OtpVerificationScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { phoneNumber } = route.params

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>کد تأیید را وارد کنید</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          کد ارسال‌شده به {formatIranPhoneNumberForDisplay(phoneNumber)} را وارد کنید.
        </Text>
      </View>
      <OtpCodePanel
        phoneNumber={phoneNumber}
        onNeedsReferral={(phone) => navigation.navigate('ReferralCode', { phoneNumber: phone })}
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
    headerTitle: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
