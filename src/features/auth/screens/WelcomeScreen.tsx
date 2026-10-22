import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon, type IconName } from '@shared/components'
import { BrandMark } from '@features/auth/components/BrandMark'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const BENEFITS: Array<{ icon: IconName; title: string; detail: string }> = [
  {
    icon: 'files',
    title: 'فایل ملک و متقاضی را در یک دقیقه ثبت کنید',
    detail: 'با چند لمس، بدون تایپ زیاد'
  },
  {
    icon: 'matching',
    title: 'فایل مناسب هر متقاضی خودش پیدا می‌شود',
    detail: 'با بودجه، متراژ و محلهٔ دلخواهش'
  },
  {
    icon: 'calendar',
    title: 'پیگیری و قراردادی یادتان نمی‌رود',
    detail: 'یادآوری به‌موقع برای هر کار'
  }
]

/** v3.0.0 (Amin #4180/#4211): navy header with the mark, three plain benefits, one button. */
export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.hero}>
        <BrandMark inverse />
        <Text style={[theme.typography('headlineLgMobile'), styles.heroTitle]}>
          همهٔ فایل‌ها و مشتری‌هایتان در یک جا
        </Text>
      </View>
      <View style={styles.body}>
        {BENEFITS.map((b) => (
          <View key={b.icon} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Icon name={b.icon} size="sm" color={theme.colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[theme.typography('titleSm'), styles.benefitTitle]}>{b.title}</Text>
              <Text style={[theme.typography('bodySm'), styles.benefitDetail]}>{b.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Button label="شروع" onPress={() => navigation.navigate('PhoneEntry')} />
      </View>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    hero: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space16,
      paddingBottom: theme.spacing.space8
    },
    heroTitle: {
      color: theme.colors.onPrimary,
      alignSelf: start
    },
    body: {
      flex: 1,
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space4,
      gap: theme.spacing.space5
    },
    benefit: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.space4,
      marginTop: theme.spacing.space2
    },
    benefitIcon: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    benefitText: {
      flex: 1,
      gap: theme.spacing.space1
    },
    benefitTitle: {
      color: theme.colors.onSurface,
      alignSelf: start
    },
    benefitDetail: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: start
    },
    footer: {
      padding: theme.spacing.space6
    }
  })
}
