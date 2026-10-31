import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { FormScreenContainer, Icon, type IconName } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import { loadOfficeStatus, useOfficeSignInWatch } from '@features/settings/services/officePanel'

type Props = NativeStackScreenProps<MainStackParamList, 'OfficeHub'>

/**
 * Amin #6330: «اتصال‌ها و API‌ها ← دفتر املاک» opens two sections: «اتصال به داشبورد دفتر» (an adviser joins an office's
 * dashboard: the connection code + word, or its QR, with the steps) and «درخواست پنل املاک» (asking for the office
 * panel, the screen it always was).
 * Amin #6597: once this app's own office request is approved, the app IS the office dashboard (#6330), so joining an
 * office is no longer offered here; one plain line says so instead (the server refuses it too). Advisers' apps unchanged.
 */
export function OfficeHubScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const token = useAuth().session?.sessionToken
  const ownOffice = useOfficeSignInWatch()
  useEffect(() => {
    if (token) loadOfficeStatus(token).catch(() => undefined) // offline: the last answer stands
  }, [token])
  const row = (icon: IconName, title: string, note: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size="sm" color={theme.colors.primary} />
        </View>
        <View style={styles.text}>
          <Text style={[theme.typography('titleSm'), styles.title]}>{title}</Text>
          <Text style={[theme.typography('bodySm'), styles.note]}>{note}</Text>
        </View>
        <Icon name="chevron" size="sm" color={theme.colors.onSurfaceVariant} />
      </View>
    </Pressable>
  )
  return (
    <FormScreenContainer headerTitle="دفتر املاک" onBack={() => navigation.goBack()}>
      {ownOffice ? (
        <View style={styles.card} accessibilityRole="text">
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Icon name="people" size="sm" color={theme.colors.primary} />
            </View>
            <View style={styles.text}>
              <Text style={[theme.typography('titleSm'), styles.title]}>اتصال به داشبورد دفتر</Text>
              <Text style={[theme.typography('bodySm'), styles.note]}>این اپ خودش داشبورد دفتر شماست و خودکار با آن یکی شده است؛ نیازی به اتصال نیست.</Text>
            </View>
          </View>
        </View>
      ) : (
        row(
          'people',
          'اتصال به داشبورد دفتر',
          'مشاور یک دفتر هستید؟ با کد اتصالی که مدیر دفتر در داشبورد می‌سازد وصل شوید و فایل‌هایی را که برایتان می‌فرستد ببینید.',
          () => navigation.navigate('OfficeJoin')
        )
      )}
      {row(
        'building',
        'درخواست پنل املاک',
        'مدیر دفتر هستید؟ پنل دفتر را درخواست دهید تا فایل‌های دفتر و کار مشاوران را در وب هم مدیریت کنید؛ پس از تأیید فعال می‌شود.',
        () => navigation.navigate('OfficePanel')
      )}
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      marginBottom: theme.spacing.space4
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space3 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.secondaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: { flex: 1, gap: theme.spacing.space1 },
    title: { color: theme.colors.onSurface, alignSelf: start },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    pressed: { opacity: 0.7 }
  })
}
