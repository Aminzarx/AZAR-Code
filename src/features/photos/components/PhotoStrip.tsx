import React, { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { Icon, LogoPlaceholder } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import { useFilesVersion } from '@shared/hooks/useFilesVersion'
import { toPersianDigits } from '@shared/utils/persianText'
import type { PhotoRecord, PhotoSubject } from '@infrastructure/database/repositories/PhotoRepository'
import { usePhotoRepository } from '../hooks/usePhotoRepository'
import { PhotoThumb } from './PhotoEditor'

/**
 * Amin #5062: the photos of a file or contract on its page — a row of thumbnails (the main photo first); a tap
 * opens them full size. With none, one faded EYVAN logo tile (Amin #5107). Photos already on the server are fetched
 * while online.
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

  if (photos.length === 0) {
    return (
      <View style={styles.wrapper} accessibilityLabel="بدون عکس">
        <Text style={[theme.typography('labelMd'), styles.title]}>عکس‌ها</Text>
        <LogoPlaceholder style={styles.thumb} />
      </View>
    )
  }
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
          {/* Amin #5737: a horizontal pager in the right-to-left app opened on an empty (black) page — its pages ran
              from the right while the offset counted from the left. One photo at a time, with «بعدی/قبلی» and its
              number, works the same in both directions. */}
          {open !== null && photos[open] ? (
            <View style={styles.page}>
              <PhotoThumb key={photos[open].id} photo={photos[open]} style={styles.full} fit="contain" />
            </View>
          ) : null}
          {photos.length > 1 && open !== null ? (
            <View style={styles.pager}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="عکس قبلی"
                disabled={open === 0}
                onPress={() => setOpen((n) => (n === null ? n : Math.max(0, n - 1)))}
                style={[styles.pagerButton, open === 0 && styles.pagerButtonOff]}
                hitSlop={8}
              >
                <Icon name="back" size="sm" color="#FFFFFF" />
              </Pressable>
              <Text style={[theme.typography('labelMd'), styles.pagerText]}>
                {`${toPersianDigits(String(open + 1))} از ${toPersianDigits(String(photos.length))}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="عکس بعدی"
                disabled={open === photos.length - 1}
                onPress={() => setOpen((n) => (n === null ? n : Math.min(photos.length - 1, n + 1)))}
                style={[styles.pagerButton, open === photos.length - 1 && styles.pagerButtonOff]}
                hitSlop={8}
              >
                <Icon name="chevron" size="sm" color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}
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
    pager: {
      position: 'absolute',
      bottom: 48,
      start: 0,
      end: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.space6
    },
    pagerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.18)'
    },
    pagerButtonOff: { opacity: 0.3 },
    pagerText: { color: '#FFFFFF' },
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
