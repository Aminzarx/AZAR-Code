import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from '@shared/components'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

type Props = NativeStackScreenProps<MainStackParamList, 'BasicProfile'>

/**
 * REF-01 ("view and share own referral code") in its most basic form —
 * a full profile screen (edit fields, share sheet, referred-users count
 * per REF-02) is Phase 12 UI work; this is the minimal post-registration
 * confirmation the Phase 8 flow asks for.
 */
export function BasicProfileScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()

  return (
    <AuthScreenContainer justify="space-between">
      <View style={styles.header}>
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>
          ثبت‌نام شما تکمیل شد
        </Text>
        <Text style={[theme.typography('bodyMd'), styles.subtitle]}>کد معرف اختصاصی شما:</Text>
        <Text style={[theme.typography('headlineLgMobile'), styles.code]}>
          {session?.referralCode}
        </Text>
      </View>
      <Button label="ورود به اپلیکیشن" onPress={() => navigation.navigate('Home')} />
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      gap: theme.spacing.space3
    },
    title: {
      color: theme.colors.primary
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant
    },
    code: {
      color: theme.colors.primary,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 4
    }
  })
}
