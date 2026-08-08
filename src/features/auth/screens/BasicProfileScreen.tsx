import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { PrimaryButton } from '@shared/components/PrimaryButton'
import { colors, spacing, typography } from '@shared/tokens'

type Props = NativeStackScreenProps<MainStackParamList, 'BasicProfile'>

/**
 * REF-01 ("view and share own referral code") in its most basic form —
 * a full profile screen (edit fields, share sheet, referred-users count
 * per REF-02) is Phase 12 UI work; this is the minimal post-registration
 * confirmation the Phase 8 flow asks for.
 */
export function BasicProfileScreen({ navigation }: Props): React.JSX.Element {
  const { session } = useAuth()

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ثبت‌نام شما تکمیل شد</Text>
          <Text style={styles.subtitle}>کد معرف اختصاصی شما:</Text>
          <Text style={styles.referralCode}>{session?.referralCode}</Text>
        </View>
        <PrimaryButton label="ورود به اپلیکیشن" onPress={() => navigation.navigate('Home')} />
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
    justifyContent: 'space-between',
    padding: spacing.space6
  },
  header: {
    gap: spacing.space3
  },
  title: {
    fontSize: typography.headlineLgMobile.fontSize,
    fontWeight: typography.headlineLgMobile.fontWeight,
    lineHeight: typography.headlineLgMobile.lineHeight,
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
  referralCode: {
    fontSize: typography.headlineLgMobile.fontSize,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 4
  }
})
