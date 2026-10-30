import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon } from '@shared/components'
import { OFFICE_PANEL_URL } from '../services/officePanel'

/**
 * Amin #5970: once the office panel is approved, the app gives way to it — this one screen, with the panel's address.
 * Nothing on the phone is wiped; turning the panel off brings the app back as it was.
 * Amin #6346 «ورود با ایوان»: the dashboard's sign-in page asks for the mobile number; the sign-in screen then opens
 * here by itself (RootNavigator's OfficeSignInPrompt, over this screen) and holding its button 3 s signs it in.
 */
export function OfficePortalScreen(): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Icon name="building" size="lg" color={theme.colors.primary} />
        </View>
        <Text style={[theme.typography('headlineMd'), styles.title]}>پرتال دفتر املاک برای شما فعال است</Text>
        <Text style={[theme.typography('bodyMd'), styles.body]}>
          از این پس کار دفتر را در پنل کاربری kssx.ir انجام دهید. فایل‌های شما سر جایشان مانده‌اند.
        </Text>
        <Button label="باز کردن پنل" fullWidth onPress={() => Linking.openURL(OFFICE_PANEL_URL).catch(() => undefined)} />

        <View style={styles.card}>
          <Text style={[theme.typography('titleSm'), styles.cardTitle]}>ورود با ایوان</Text>
          <Text style={[theme.typography('bodySm'), styles.note]}>
            در صفحهٔ ورود داشبورد دفتر «ورود با ایوان» را بزنید و شمارهٔ همراه خود را بنویسید. همان لحظه صفحهٔ ورود همین‌جا باز
            می‌شود؛ دکمهٔ آن را ۳ ثانیه نگه دارید. تا وقت ورود، برنامه را باز نگه دارید.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.space6, gap: theme.spacing.space4, alignItems: 'stretch' },
    badge: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: theme.spacing.space6
    },
    title: { color: theme.colors.onSurface, textAlign: 'center' }, // rtl-allow: headline under the centred badge
    body: { color: theme.colors.onSurfaceVariant, textAlign: 'center' }, // rtl-allow: one line under the centred headline
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space4
    },
    cardTitle: { color: theme.colors.onSurface, alignSelf: start },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start }
  })
}
