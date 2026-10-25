import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@features/auth/AuthProvider'
import { Icon, LogoPlaceholder } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import { toPersianDigits } from '@shared/utils/persianText'
import { MAX_PHOTOS, photoDataUri } from '@infrastructure/images/listingPhotos'
import { movePhoto, type EditorPhoto } from '../photoList'
import type { PhotoAdder } from './PhotoAddButton'

type Props = {
  photos: readonly EditorPhoto[]
  onChange: (photos: EditorPhoto[]) => void
  /** what the photos are of, for the hint («فایل» / «قرارداد») */
  noun: string
  /** Amin #5170: the «افزودن عکس» button sits in the screen's footer (PhotoAddButton); its progress and errors show here */
  adder: PhotoAdder
}

/**
 * Amin #5062: the «عکس‌ها» step of a new property file or contract. Photos come from the camera or the gallery,
 * are made WebP (long side 1600, quality 80, no location data) in memory (see usePhotoAdder), and can be reordered (the first is the
 * main photo) or removed. The line on top says how many there are; tokens are counted only when the file is saved
 * (Amin #5108), so none are shown here. Empty places show the faded EYVAN logo (#5107).
 */
export function PhotoEditor({ photos, onChange, noun, adder }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { busy, error } = adder

  return (
    <View style={styles.wrapper}>
      <Text style={[theme.typography('bodySm'), styles.summary]}>
        {photos.length === 0
          ? `عکس‌های ${noun} را اضافه کنید (اختیاری، تا ${toPersianDigits(String(MAX_PHOTOS))} عکس)`
          : `${toPersianDigits(String(photos.length))} از ${toPersianDigits(String(MAX_PHOTOS))} عکس`}
      </Text>
      {busy ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}

      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.key} style={styles.cell}>
            <PhotoThumb photo={photo} style={styles.thumb} />
            {index === 0 ? (
              <View style={styles.mainBadge}>
                <Text style={[theme.typography('labelSm'), styles.mainText]}>عکس اصلی</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`حذف عکس ${toPersianDigits(String(index + 1))}`}
              onPress={() => onChange(photos.filter((p) => p.key !== photo.key))}
              hitSlop={6}
              style={styles.remove}
            >
              <Icon name="close" size="xs" color={theme.colors.onError} />
            </Pressable>
            <View style={styles.moves}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`عکس ${toPersianDigits(String(index + 1))} یکی جلوتر`}
                accessibilityState={{ disabled: index === 0 }}
                disabled={index === 0}
                onPress={() => onChange(movePhoto(photos, index, -1))}
                style={[styles.move, index === 0 && styles.moveOff]}
              >
                <Icon name="chevron" size="xs" color={theme.colors.onSurface} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`عکس ${toPersianDigits(String(index + 1))} یکی عقب‌تر`}
                accessibilityState={{ disabled: index === photos.length - 1 }}
                disabled={index === photos.length - 1}
                onPress={() => onChange(movePhoto(photos, index, 1))}
                style={[styles.move, styles.moveLater, index === photos.length - 1 && styles.moveOff]}
              >
                <Icon name="chevron" size="xs" color={theme.colors.onSurface} />
              </Pressable>
            </View>
          </View>
        ))}
        {photos.length === 0
          ? [0, 1, 2].map((slot) => <LogoPlaceholder key={slot} style={[styles.cell, styles.placeholder]} />)
          : null}
      </View>
      <Text style={[theme.typography('bodySm'), styles.hint]}>
        عکس‌ها بدون مکان و مشخصات گوشی ذخیره می‌شوند؛ اولین عکس، عکس اصلی است.
      </Text>
    </View>
  )
}

/** A photo's picture: its bytes while on the phone, else fetched from the server; a quiet box until then. */
export function PhotoThumb({
  photo,
  style,
  fit = 'cover'
}: {
  photo: { data?: string | null; blobHash?: string | null }
  style: object
  fit?: 'cover' | 'contain'
}): React.JSX.Element {
  const theme = useTheme()
  const { loadPhoto } = useAuth()
  const [data, setData] = useState<string | null>(photo.data ?? null)
  useEffect(() => {
    let cancelled = false
    if (photo.data) {
      setData(photo.data)
      return
    }
    loadPhoto({ data: null, blobHash: photo.blobHash ?? null })
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [photo.data, photo.blobHash, loadPhoto])
  return data ? (
    <Image source={{ uri: photoDataUri(data) }} style={style} resizeMode={fit} />
  ) : (
    <LogoPlaceholder style={[style, fit === 'contain' && { backgroundColor: theme.colors.surfaceContainerHighest }]} />
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: { gap: theme.spacing.space4 },
    summary: { color: theme.colors.onSurfaceVariant, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    error: { color: theme.colors.error, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.space3 },
    cell: { width: '30%', aspectRatio: 1 },
    thumb: { width: '100%', height: '100%', borderRadius: theme.radius.medium },
    placeholder: { borderRadius: theme.radius.medium },
    mainBadge: {
      position: 'absolute',
      bottom: 6,
      start: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary
    },
    mainText: { color: theme.colors.onPrimary },
    remove: {
      position: 'absolute',
      top: 6,
      end: 6,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.error
    },
    moves: {
      position: 'absolute',
      top: 6,
      start: 6,
      flexDirection: 'row',
      gap: 4
    },
    move: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceContainerLowest,
      // «جلوتر» = toward the start of the list: in RTL that is to the right, as the chevron draws by default
      transform: [{ scaleX: theme.isRTL ? -1 : 1 }]
    },
    moveLater: { transform: [{ scaleX: theme.isRTL ? 1 : -1 }] },
    moveOff: { opacity: 0.35 },
    hint: { color: theme.colors.onSurfaceVariant, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' }
  })
}
