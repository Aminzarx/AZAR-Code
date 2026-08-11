import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from '@shared/components'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <AuthScreenContainer justify="space-between">
      <View>
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>به آزار خوش آمدید</Text>
        <Text style={[theme.typography('bodyLg'), styles.subtitle]}>
          مدیریت فایل‌های ملکی، متقاضیان و قراردادها — همه به‌صورت آفلاین و امن روی دستگاه شما.
        </Text>
      </View>
      <Button label="شروع کنید" onPress={() => navigation.navigate('PhoneEntry')} />
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.primary,
      marginBottom: theme.spacing.space3,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
