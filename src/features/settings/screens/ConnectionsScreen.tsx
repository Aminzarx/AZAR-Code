import React, { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { ConfirmDialog, FormScreenContainer, Icon } from '@shared/components'
import { DIVAR_CONSENT_TEXT, useDivarImportSwitch } from '@features/property/services/divarSwitch'

type Props = NativeStackScreenProps<MainStackParamList, 'Connections'>

/**
 * Amin #5795: «اتصال‌ها و API‌ها» — the outside services EYVAN can use, each off until the user turns it on. First:
 * «ورود آگهی از دیوار»; turning it on asks for agreement to the terms, and the server records it.
 */
export function ConnectionsScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { on, turn } = useDivarImportSwitch()
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function change(value: boolean): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await turn(value)
      setAsking(false)
    } catch {
      setAsking(false)
      setError('تغییر ذخیره نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormScreenContainer headerTitle="اتصال‌ها و API‌ها" onBack={() => navigation.goBack()}>
      {route.params?.fromShare && !on ? (
        <Text style={[theme.typography('bodyMd'), styles.notice]}>
          برای ورود آگهی‌ای که از دیوار فرستادید، اول «ورود آگهی از دیوار» را روشن کنید؛ بعد دوباره از دیوار بفرستید.
        </Text>
      ) : null}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name="download" size="sm" color={theme.colors.primary} />
          </View>
          <View style={styles.text}>
            <Text style={[theme.typography('titleSm'), styles.title]}>ورود آگهی از دیوار</Text>
            <Text style={[theme.typography('bodySm'), styles.note]}>
              آگهی خودتان در دیوار را با چسباندن لینک یا «اشتراک‌گذاری ← ایوان» به یک فایل تازه تبدیل کنید.
            </Text>
          </View>
          <Switch
            accessibilityLabel="ورود آگهی از دیوار"
            value={on === true}
            disabled={on === null || busy}
            onValueChange={(value) => {
              if (value) setAsking(true)
              else change(false).catch(() => undefined)
            }}
            trackColor={{ true: theme.colors.primary, false: theme.colors.outlineVariant }}
          />
        </View>
        {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
      </View>
      {/* Amin #5970/#6032: the office panel is asked for here; sales management approves */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="پنل دفتر املاک"
        onPress={() => navigation.navigate('OfficePanel')}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name="building" size="sm" color={theme.colors.primary} />
          </View>
          <View style={styles.text}>
            <Text style={[theme.typography('titleSm'), styles.title]}>پنل دفتر املاک</Text>
            <Text style={[theme.typography('bodySm'), styles.note]}>
              فایل‌های دفتر و کار مشاوران را در وب مدیریت کنید؛ با درخواست و پس از تأیید.
            </Text>
          </View>
          <Icon name="chevron" size="sm" color={theme.colors.onSurfaceVariant} />
        </View>
      </Pressable>
      {/* Amin #6330: an adviser joins an office with the dashboard's connection code (typed or scanned) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="اتصال به دفتر املاک"
        onPress={() => navigation.navigate('OfficeJoin')}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name="people" size="sm" color={theme.colors.primary} />
          </View>
          <View style={styles.text}>
            <Text style={[theme.typography('titleSm'), styles.title]}>اتصال به دفتر املاک</Text>
            <Text style={[theme.typography('bodySm'), styles.note]}>
              مشاور یک دفتر هستید؟ با کد اتصالی که مدیر دفتر می‌دهد وصل شوید و فایل‌هایی را که برایتان می‌فرستد ببینید.
            </Text>
          </View>
          <Icon name="chevron" size="sm" color={theme.colors.onSurfaceVariant} />
        </View>
      </Pressable>
      <ConfirmDialog
        visible={asking}
        title="ورود آگهی از دیوار"
        description={DIVAR_CONSENT_TEXT}
        confirmLabel="می‌پذیرم"
        cancelLabel="انصراف"
        isConfirming={busy}
        onConfirm={() => {
          change(true).catch(() => undefined)
        }}
        onCancel={() => setAsking(false)}
      />
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
      gap: theme.spacing.space3,
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
    error: { color: theme.colors.error, alignSelf: start },
    pressed: { opacity: 0.7 },
    notice: { color: theme.colors.onSurface, marginBottom: theme.spacing.space4, alignSelf: start }
  })
}
