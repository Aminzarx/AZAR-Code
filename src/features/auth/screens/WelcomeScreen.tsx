import React, { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon, type IconName } from '@shared/components'
import { takeSignedOutNotice } from '../signedOutNotice'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

// Amin #5233: the EYVAN logo on the start page (the light-text version, for the navy header)
const logo = require('../../../assets/eyvan-logo-dark.png')

// Amin #5280: the start-page texts as he wrote them
const BENEFITS: Array<{ icon: IconName; title: string; detail: string }> = [
  {
    icon: 'files',
    title: 'ثبت آسان و فوری فایل‌ها',
    detail: 'با چند لمس، بدون تایپ زیاد'
  },
  {
    icon: 'matching',
    title: 'انطباق هوشمند',
    detail: 'با بودجه، متراژ و محلهٔ دلخواهش'
  },
  {
    icon: 'calendar',
    title: 'سیستم پیگیری خودکار',
    detail: 'یادآوری به‌موقع برای هر کار'
  }
]

/** v3.0.0 (Amin #4180/#4211): navy header with the logo (#5233), three plain benefits, one button. */
export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  // Amin #5645: why this phone was signed out, if another phone took the number
  const [notice] = useState(takeSignedOutNotice)

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} accessibilityLabel="ایوان" />
        <Text style={[theme.typography('headlineLgMobile'), styles.heroTitle]}>
          به جمع حرفه‌ای‌ها خوش آمدید
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
        {notice ? (
          <View style={styles.notice} accessibilityRole="alert">
            <Icon name="info" size="sm" color={theme.colors.onWarningContainer} />
            <Text style={[theme.typography('bodySm'), styles.noticeText]}>{notice}</Text>
          </View>
        ) : null}
        <Button label="شروع کنید" onPress={() => navigation.navigate('PhoneEntry') /* Amin #5745: number first */} />
      </View>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.space2,
      padding: theme.spacing.space3,
      marginBottom: theme.spacing.space3,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.warningContainer
    },
    noticeText: {
      flex: 1,
      color: theme.colors.onWarningContainer
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    hero: {
      backgroundColor: theme.colors.brand,
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space16,
      paddingBottom: theme.spacing.space8
    },
    logo: {
      width: 96,
      height: 96,
      alignSelf: start,
      marginBottom: theme.spacing.space4
    },
    heroTitle: {
      color: theme.colors.onBrand,
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
