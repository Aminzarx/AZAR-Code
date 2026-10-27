import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from '@shared/components'
import { formatDateTime } from '@shared/utils/formatDate'
import { toPersianDigits } from '@shared/utils/persianText'
import { useAuth } from '../AuthProvider'

export const OFFLINE_FILES_TEXT = 'آفلاین هستید؛ پرونده‌های قبلی با اتصال به اینترنت نمایش داده می‌شوند'

/** Amin #5524: offline with the copy kept on the phone — what shows is the copy from `at` */
export function offlineCopyText(at: string | null | undefined, pending: number): string {
  const from = at ? `آخرین نسخهٔ ذخیره‌شده (${formatDateTime(at)}) نمایش داده می‌شود` : 'پرونده‌ها از روی گوشی نمایش داده می‌شوند'
  const queued = pending > 0 ? `؛ ${toPersianDigits(String(pending))} تغییر با وصل شدن اینترنت فرستاده می‌شود` : ''
  return `بدون اینترنت؛ ${from}${queued}`
}

/**
 * Amin #4826 (option A): while the phone is offline and the account's files have not come from the server in this
 * run, only what was made offline shows — this line says so.
 * Amin #5455 / #5524: the phone now keeps an encrypted copy of the files, so offline they open from it; the line
 * then says «بدون اینترنت», from when the copy is and how many changes wait to go. It goes away by itself online.
 */
export function OfflineFilesNotice(): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const net = useNetInfo()
  const { session, sync } = useAuth()
  if (!session || !sync?.settled || sync.state === 'syncing') return null
  const offline = net.isConnected === false || net.isInternetReachable === false || sync.state === 'offline'
  let text: string | null = null
  if (!sync.loaded && !sync.copyAt) text = OFFLINE_FILES_TEXT
  else if (offline) text = offlineCopyText(sync.loaded ? null : sync.copyAt, sync.pending)
  if (!text) return null
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Icon name="cloud-offline" size="sm" color={theme.colors.onTertiaryContainer} />
      <Text style={[theme.typography('labelMd'), styles.text]}>{text}</Text>
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
      // Amin #5315: the offline line in dark grey (light grey on dark), on the neutral container
      backgroundColor: theme.colors.tertiaryContainer
    },
    text: { flex: 1, color: theme.colors.onTertiaryContainer, textAlign: 'left' }
  })
}
