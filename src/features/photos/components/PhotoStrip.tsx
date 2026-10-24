import React, { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { Icon } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import { useFilesVersion } from '@shared/hooks/useFilesVersion'
import { toPersianDigits } from '@shared/utils/persianText'
import type { PhotoRecord, PhotoSubject } from '@infrastructure/database/repositories/PhotoRepository'
import { usePhotoRepository } from '../hooks/usePhotoRepository'
import { PhotoThumb } from './PhotoEditor'

/**
 * Amin #5062: the photos of a file or contract on its page — a row of thumbnails (the main photo first); a tap
 * opens them full size. Nothing shows when there are none. Photos already on the server are fetched while online.
 */
export function PhotoStrip({
  subjectType,
  subjectId,
  refreshKey
}: {
  subjectType: PhotoSubject
  subjectId: string
  /** changes when the page saved new photos */
  refreshKey?: number
}): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const repository = usePhotoRepository()
  const filesVersion = useFilesVersion()
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const { width } = useWindowDimensions()

  useEffect(() => {
    let cancelled = false
    repository
      ?.listFor(subjectType, subjectId)
      .then((list) => {
        if (!cancelled) setPhotos(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [repository, subjectType, subjectId, filesVersion, refreshKey])

  if (photos.length === 0) return null
  return (
    <View style={styles.wrapper}>
      <Text style={[theme.typography('labelMd'), styles.title]}>
        {`عکس‌ها (${toPersianDigits(String(photos.length))})`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((photo, index) => (
          <Pressable
            key={photo.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={`عکس ${toPersianDigits(String(index + 1))}`}
            onPress={() => setOpen(index)}
          >
            <PhotoThumb photo={photo} style={styles.thumb} />
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={styles.viewer}>
          <RNScrollView
            horizontal
            pagingEnabled
            contentOffset={{ x: (open ?? 0) * width, y: 0 }}
            showsHorizontalScrollIndicator={false}
          >
            {photos.map((photo) => (
              <View key={photo.id} style={[styles.page, { width: width }]}>
                <PhotoThumb photo={photo} style={styles.full} fit="contain" />
              </View>
            ))}
          </RNScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بستن عکس"
            onPress={() => setOpen(null)}
            style={styles.close}
            hitSlop={8}
          >
            <Icon name="close" size="sm" color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: { gap: theme.spacing.space2 },
    title: { color: theme.colors.onSurface, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    row: { gap: theme.spacing.space2 },
    thumb: { width: 96, height: 96, borderRadius: theme.radius.medium },
    viewer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)' },
    page: { flex: 1, justifyContent: 'center' },
    full: { width: '100%', height: '80%' },
    close: {
      position: 'absolute',
      top: 40,
      end: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.18)'
    }
  })
}
