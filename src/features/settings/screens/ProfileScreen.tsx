import React, { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme, type Theme } from '@shared/theme'
import { Button, FormScreenContainer, Icon, TextInput } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatIranPhoneNumberForDisplay } from '@shared/utils/iranPhoneNumber'
import { photoUri, pickProfilePhoto, removeProfilePhotoFile } from '@infrastructure/images/profilePhoto'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { saveProfile, useProfile } from '../hooks/useProfile'

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>

/**
 * v1.5.0 (Amin #4632): «ساخت پروفایل» — opened by «ویرایش» on «من». The
 * user sets a photo (saved as WebP), their name and their agency's name;
 * the number is changed from here too («تغییر شماره»).
 */
export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { profile } = useProfile()
  const [name, setName] = useState('')
  const [agency, setAgency] = useState('')
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // fill the form once, from the first load; later reloads (coming back from
  // «تغییر شماره») only refresh the number, not what the user is typing
  useEffect(() => {
    if (!loaded && (profile.displayName !== null || profile.phoneNumber !== null || profile.photoPath !== null)) {
      setName(profile.displayName ?? '')
      setAgency(profile.agencyName ?? '')
      setPhotoPath(profile.photoPath)
      setLoaded(true)
    }
  }, [profile, loaded])

  const isDirty =
    name.trim() !== (profile.displayName ?? '') ||
    agency.trim() !== (profile.agencyName ?? '') ||
    photoPath !== profile.photoPath

  async function handlePickPhoto(): Promise<void> {
    setError(null)
    setIsPicking(true)
    try {
      const saved = await pickProfilePhoto()
      if (saved) {
        if (photoPath && photoPath !== profile.photoPath) await removeProfilePhotoFile(photoPath)
        setPhotoPath(saved)
      }
    } catch {
      setError('این عکس باز نشد. عکس دیگری انتخاب کنید.')
    } finally {
      setIsPicking(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      setError('نام و نام خانوادگی را بنویسید.')
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      await saveProfile({ displayName: name, agencyName: agency, photoPath })
      if (profile.photoPath && profile.photoPath !== photoPath) await removeProfilePhotoFile(profile.photoPath)
      navigation.goBack()
    } catch {
      setError('ذخیره نشد. دوباره تلاش کنید.')
      setIsSaving(false)
    }
  }

  const uri = photoUri(photoPath)
  const initial = (name || 'ا').trim().charAt(0)

  return (
    <FormScreenContainer
      headerTitle="پروفایل"
      onBack={() => navigation.goBack()}
      isDirty={isDirty}
      footer={
        <Button label="ذخیرهٔ پروفایل" onPress={handleSave} loading={isSaving} disabled={!isDirty && loaded} />
      }
    >
      <View style={styles.photoBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uri ? 'تغییر عکس پروفایل' : 'انتخاب عکس پروفایل'}
          onPress={handlePickPhoto}
          disabled={isPicking}
          style={styles.photoFrame}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.photo} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <Text style={[theme.typography('headlineMd'), styles.photoInitial]}>{initial}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Icon name="camera" size="sm" color={theme.colors.onPrimary} />
          </View>
        </Pressable>
        <View style={styles.photoActions}>
          <Button
            label={isPicking ? 'در حال آماده‌سازی…' : uri ? 'تغییر عکس' : 'انتخاب عکس'}
            variant="text"
            fullWidth={false}
            onPress={handlePickPhoto}
            disabled={isPicking}
          />
          {uri ? <Button label="حذف عکس" variant="text" fullWidth={false} onPress={() => setPhotoPath(null)} /> : null}
        </View>
        <Text style={[theme.typography('bodySm'), styles.hint]}>
          عکس کوچک و سبک ذخیره می‌شود تا جای کمی بگیرد.
        </Text>
      </View>

      <TextInput label="نام و نام خانوادگی" required value={name} onChangeText={setName} placeholder="مثلاً علی رضایی" />
      <TextInput
        label="نام مشاور املاک (اختیاری)"
        value={agency}
        onChangeText={setAgency}
        placeholder="مثلاً املاک آفتاب"
      />

      <View style={styles.phoneCard}>
        <View style={styles.phoneText}>
          <Text style={[theme.typography('labelMd'), styles.phoneLabel]}>شمارهٔ موبایل</Text>
          <Text style={[theme.typography('titleSm'), styles.phoneValue]}>
            {profile.phoneNumber ? toPersianDigits(formatIranPhoneNumberForDisplay(profile.phoneNumber)) : '-'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تغییر شماره"
          onPress={() => navigation.navigate('ChangePhone')}
          style={styles.phoneButton}
        >
          <Icon name="edit" size="xs" color={theme.colors.primary} />
          <Text style={[theme.typography('labelMd'), styles.phoneButtonText]}>تغییر شماره</Text>
        </Pressable>
      </View>

      {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
    </FormScreenContainer>
  )
}

const PHOTO = 112

function createStyles(theme: Theme) {
  return StyleSheet.create({
    photoBlock: { alignItems: 'center', gap: theme.spacing.space2, paddingTop: theme.spacing.space2 },
    photoFrame: { width: PHOTO, height: PHOTO },
    photo: { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2 },
    photoEmpty: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
    photoInitial: { color: theme.colors.onPrimary, textAlign: 'center' },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      borderWidth: 3,
      borderColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center'
    },
    photoActions: { flexDirection: 'row', gap: theme.spacing.space2 },
    hint: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
    phoneCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space4,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    phoneText: { flex: 1, gap: 2, alignItems: theme.isRTL ? 'flex-start' : 'flex-end' },
    phoneLabel: { color: theme.colors.onSurfaceVariant },
    phoneValue: { color: theme.colors.onSurface },
    phoneButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer
    },
    phoneButtonText: { color: theme.colors.primary },
    error: { color: theme.colors.error }
  })
}
