import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Icon } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import type { Announcement } from '@infrastructure/sync/syncApiClient'

/** Amin #5370: one KSS announcement, coloured by its tone, with × to dismiss it. */
export function AnnouncementCard({
  announcement,
  onDismiss
}: {
  announcement: Announcement
  onDismiss: () => void
}): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const tone = toneColors(theme, announcement.tone)
  return (
    <View
      style={[styles.card, { backgroundColor: tone.container, borderColor: tone.accent }]}
      accessibilityLabel={`اعلان: ${announcement.title}`}
    >
      <View style={styles.text}>
        <Text style={[theme.typography('titleSm'), styles.title, { color: tone.onContainer }]}>{announcement.title}</Text>
        {announcement.body ? (
          <Text style={[theme.typography('bodyMd'), styles.body, { color: tone.onContainer }]}>{announcement.body}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`بستن اعلان ${announcement.title}`}
        onPress={onDismiss}
        hitSlop={10}
        style={styles.close}
      >
        <Icon name="close" size="sm" color={tone.onContainer} />
      </Pressable>
    </View>
  )
}

function toneColors(theme: Theme, tone: Announcement['tone']): { container: string; onContainer: string; accent: string } {
  const c = theme.colors
  switch (tone) {
    case 'success':
      return { container: c.successContainer, onContainer: c.onSuccessContainer, accent: c.success }
    case 'warning':
      return { container: c.warningContainer, onContainer: c.onWarningContainer, accent: c.warning }
    case 'danger':
      return { container: c.errorContainer, onContainer: c.onErrorContainer, accent: c.error }
    default:
      return { container: c.infoContainer, onContainer: c.onInfoContainer, accent: c.info }
  }
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.space3,
      padding: theme.spacing.space4,
      borderRadius: theme.radius.large,
      borderStartWidth: 4
    },
    text: { flex: 1, gap: theme.spacing.space1 },
    title: { alignSelf: start },
    body: { alignSelf: start },
    close: { padding: 2 }
  })
}
