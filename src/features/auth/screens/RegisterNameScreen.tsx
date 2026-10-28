import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterName'>

/**
 * Amin #5348 / #5745: only a new account sees this page — after its number and code, when the server has no account
 * for it. First and last name (and the agency, optional), then the invite page.
 */
export function RegisterNameScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [agency, setAgency] = useState('')
  const [tried, setTried] = useState(false)

  // Amin #5746: «ادامه» is never a dead grey button — a tap says what is missing under the field. A whole name typed
  // in «نام» with «نام خانوادگی» left empty is split at its first space.
  function names(): { first: string; last: string } {
    const first = firstName.trim().replace(/\s+/g, ' ')
    const last = lastName.trim().replace(/\s+/g, ' ')
    if (!last && first.includes(' ')) {
      const at = first.indexOf(' ')
      return { first: first.slice(0, at), last: first.slice(at + 1) }
    }
    return { first, last }
  }
  const { first, last } = names()
  const firstError = tried && first.length < 2 ? 'نام را بنویسید (دست‌کم ۲ حرف).' : undefined
  const lastError = tried && last.length < 2 ? 'نام خانوادگی را بنویسید (دست‌کم ۲ حرف).' : undefined

  function handleContinue(): void {
    setTried(true)
    if (first.length < 2 || last.length < 2) return
    navigation.navigate('ReferralCode', {
      phoneNumber: route.params.phoneNumber,
      displayName: `${first} ${last}`,
      agencyName: agency.trim() || undefined
    })
  }

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>معرفی خودتان</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>
          حساب تازه است؛ نام خود را بنویسید.
        </Text>
      </View>
      <View style={styles.form}>
        {/* Amin #5817: first and last name side by side */}
        <View style={styles.nameRow}>
          <View style={styles.half}>
            <TextInput
              label="نام"
              required
              value={firstName}
              onChangeText={setFirstName}
              placeholder="مثلاً علی"
              errorMessage={firstError}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
          <View style={styles.half}>
            <TextInput
              label="نام خانوادگی"
              required
              value={lastName}
              onChangeText={setLastName}
              placeholder="مثلاً رضایی"
              errorMessage={lastError}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>
        <TextInput
          label="نام مشاور املاک (اختیاری)"
          value={agency}
          onChangeText={setAgency}
          placeholder="مثلاً املاک پارسه"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
        <Button label="ادامه" onPress={handleContinue} />
      </View>
    </AuthScreenContainer>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    header: { gap: theme.spacing.space2, marginBottom: theme.spacing.space8 },
    headerTitle: { color: theme.colors.primary, alignSelf: start },
    headerSubtitle: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    form: { gap: theme.spacing.space5 },
    nameRow: { flexDirection: 'row', gap: theme.spacing.space3, alignItems: 'flex-start' },
    half: { flex: 1 }
  })
}
