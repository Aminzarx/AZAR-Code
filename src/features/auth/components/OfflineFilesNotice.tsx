import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from '@shared/components'
import { useAuth } from '../AuthProvider'

export const OFFLINE_FILES_TEXT = 'آفلاین هستید؛ پرونده‌های قبلی با اتصال به اینترنت نمایش داده می‌شوند'

/**
 * Amin #4826 (option A): the files are not kept on the phone, so while it is offline and the account's files have
 * not come from the server in this run, only what was made offline shows — this line says so. It goes away by
 * itself the moment the files arrive.
 */
export function OfflineFilesNotice(): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session, sync } = useAuth()
  if (!session || !sync?.settled || sync.loaded || sync.state === 'syncing') return null
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Icon name="cloud-offline" size="sm" color={theme.colors.onWarningContainer} />
      <Text style={[theme.typography('labelMd'), styles.text]}>{OFFLINE_FILES_TEXT}</Text>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      minHeight: theme.touchTargetMinimum,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.warningContainer
    },
    text: { flex: 1, color: theme.colors.onWarningContainer, textAlign: 'left' }
  })
}
