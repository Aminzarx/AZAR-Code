import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { colors, radius, spacing, touchTargetMinimum, typography } from '@shared/tokens'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.title}>به آزار خوش آمدید</Text>
          <Text style={styles.subtitle}>
            مدیریت پرونده‌های ملکی، متقاضیان و قراردادها — همه به‌صورت آفلاین و امن روی دستگاه شما.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => navigation.navigate('PhoneEntry')}
        >
          <Text style={styles.primaryButtonText}>شروع کنید</Text>
        </Pressable>
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
  title: {
    fontSize: typography.headlineLgMobile.fontSize,
    fontWeight: typography.headlineLgMobile.fontWeight,
    lineHeight: typography.headlineLgMobile.lineHeight,
    color: colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.space3
  },
  subtitle: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: typography.bodyLg.fontWeight,
    lineHeight: typography.bodyLg.lineHeight,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl'
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.large,
    minHeight: touchTargetMinimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space4
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: typography.labelMd.fontSize,
    fontWeight: typography.labelMd.fontWeight
  }
})
