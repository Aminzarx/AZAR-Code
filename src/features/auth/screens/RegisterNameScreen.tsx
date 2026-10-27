import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@navigation/AuthNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { Button, TextInput } from '@shared/components'
import { AuthScreenContainer } from '@features/auth/AuthScreenContainer'

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterName'>

/**
 * Amin #5348 / #5565: first page after «شروع کنید» — first and last name (and the agency, optional), then the number
 * and its code. A new account gets this name; an existing one signs in with its own.
 */
export function RegisterNameScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [agency, setAgency] = useState('')
  const canContinue = firstName.trim().length >= 2 && lastName.trim().length >= 2

  function handleContinue(): void {
    if (!canContinue) return
    navigation.navigate('PhoneEntry', {
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      agencyName: agency.trim() || undefined
    })
  }

  return (
    <AuthScreenContainer>
      <View style={styles.header}>
        <Text style={[theme.typography('titleMd'), styles.headerTitle]}>معرفی خودتان</Text>
        <Text style={[theme.typography('bodyMd'), styles.headerSubtitle]}>برای شروع، نام خود را بنویسید؛ بعد شمارهٔ موبایل.</Text>
      </View>
      <View style={styles.form}>
        <TextInput label="نام" required value={firstName} onChangeText={setFirstName} placeholder="مثلاً علی" autoFocus />
        <TextInput label="نام خانوادگی" required value={lastName} onChangeText={setLastName} placeholder="مثلاً رضایی" />
        <TextInput
          label="نام مشاور املاک (اختیاری)"
          value={agency}
          onChangeText={setAgency}
          placeholder="مثلاً املاک پارسه"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
        <Button label="ادامه" onPress={handleContinue} disabled={!canContinue} />
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
    form: { gap: theme.spacing.space5 }
  })
}
