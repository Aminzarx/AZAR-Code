import React, { useState } from 'react'
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Icon } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import { AUTH_API_BASE_URL } from '@infrastructure/auth/config'
import type { Announcement } from '@infrastructure/sync/syncApiClient'

/**
 * Amin #5370: one KSS announcement, coloured by its tone, with × to dismiss it.
 * Amin #6214: a megaphone marks it as KSS's; the corners follow the reminder cards (left ones only slightly rounded);
 * a picture shows inside (tap = full screen), a sound or video opens in the phone's player. Tapping the card or opening
 * its media counts as «opened» for KSS's reach numbers.
 */
export function AnnouncementCard({
  announcement,
  onDismiss,
  onOpen
}: {
  announcement: Announcement
  onDismiss: () => void
  onOpen?: () => void
}): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const tone = toneColors(theme, announcement.tone)
  const [fullImage, setFullImage] = useState(false)
  const media = announcement.media ?? null
  const mediaUrl = media ? `${AUTH_API_BASE_URL}${media.url}` : null

  function playMedia(): void {
    onOpen?.()
    if (mediaUrl) Linking.openURL(mediaUrl).catch(() => undefined)
  }

  return (
    <Pressable
      onPress={onOpen}
      style={[styles.card, { backgroundColor: tone.container, borderColor: tone.accent }]}
      accessibilityLabel={`اعلان: ${announcement.title}`}
    >
      <View style={[styles.badge, { backgroundColor: tone.accent }]}>
        <Icon name="megaphone" size="sm" color={tone.container} />
      </View>
      <View style={styles.text}>
        <Text style={[theme.typography('titleSm'), styles.title, { color: tone.onContainer }]}>{announcement.title}</Text>
        {announcement.body ? (
          <Text style={[theme.typography('bodyMd'), styles.body, { color: tone.onContainer }]}>{announcement.body}</Text>
        ) : null}
        {media?.kind === 'image' && mediaUrl ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`عکس اعلان ${announcement.title}، بزرگ‌تر ببینید`}
            onPress={() => {
              onOpen?.()
              setFullImage(true)
            }}
          >
            <Image source={{ uri: mediaUrl }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ) : null}
        {media && media.kind !== 'image' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={media.kind === 'audio' ? 'پخش صدای اعلان' : 'پخش ویدیوی اعلان'}
            onPress={playMedia}
            style={[styles.play, { borderColor: tone.accent }]}
          >
            <Icon name="play" size="sm" color={tone.onContainer} />
            <Text style={[theme.typography('labelMd'), { color: tone.onContainer }]}>
              {media.kind === 'audio' ? 'پخش صدا' : 'پخش ویدیو'}
            </Text>
          </Pressable>
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
      {fullImage && mediaUrl ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFullImage(false)}>
          <Pressable style={styles.viewer} onPress={() => setFullImage(false)} accessibilityLabel="بستن عکس">
            <Image source={{ uri: mediaUrl }} style={styles.viewerImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      ) : null}
    </Pressable>
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
      borderStartWidth: 4,
      // Amin #6214: the same corners as the reminder cards (Amin #5634: the left ones only slightly rounded)
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2
    },
    badge: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center'
    },
    text: { flex: 1, gap: theme.spacing.space1 },
    title: { alignSelf: start },
    body: { alignSelf: start },
    image: {
      marginTop: theme.spacing.space2,
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: theme.radius.medium
    },
    play: {
      marginTop: theme.spacing.space2,
      alignSelf: start,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2,
      paddingVertical: theme.spacing.space2,
      paddingHorizontal: theme.spacing.space3,
      borderRadius: theme.radius.full,
      borderWidth: 1
    },
    close: { padding: 2 },
    viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
    viewerImage: { width: '100%', height: '100%' }
  })
}
