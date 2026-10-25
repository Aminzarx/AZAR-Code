import React, { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Button, Icon, type IconName } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import {
  CameraPermissionError,
  MAX_PHOTOS,
  pickPhotos,
  takePhoto,
  type ConvertedPhoto
} from '@infrastructure/images/listingPhotos'
import type { EditorPhoto } from '../photoList'

let nextKey = 0
function asEditorPhoto(photo: ConvertedPhoto): EditorPhoto {
  nextKey += 1
  return {
    key: `new-${Date.now()}-${nextKey}`,
    data: photo.base64,
    bytes: photo.bytes,
    width: photo.width,
    height: photo.height
  }
}

export type PhotoAdder = {
  add: (source: 'camera' | 'gallery') => Promise<void>
  busy: boolean
  error: string | null
  /** photos that can still be added */
  room: number
}

/** Adding photos from the camera or the gallery: WebP in memory (see listingPhotos), up to MAX_PHOTOS. */
export function usePhotoAdder(photos: readonly EditorPhoto[], onChange: (photos: EditorPhoto[]) => void): PhotoAdder {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const room = MAX_PHOTOS - photos.length

  async function add(source: 'camera' | 'gallery'): Promise<void> {
    if (busy || room <= 0) return
    setError(null)
    setBusy(true)
    try {
      const added =
        source === 'camera'
          ? [await takePhoto()].filter((p): p is ConvertedPhoto => p !== null)
          : await pickPhotos(room)
      if (added.length > 0) onChange([...photos, ...added.map(asEditorPhoto)])
    } catch (caught) {
      setError(
        caught instanceof CameraPermissionError
          ? 'برای عکس گرفتن، اجازهٔ دوربین را بدهید.'
          : 'افزودن عکس انجام نشد. دوباره تلاش کنید.'
      )
    } finally {
      setBusy(false)
    }
  }

  return { add, busy, error, room }
}

const MENU_GAP = 8

/**
 * Amin #5170: one «افزودن عکس» button, right above the continue/save button; it opens a small menu of «دوربین» and
 * «گالری» just above itself, the same menu as the profile photo's.
 */
export function PhotoAddButton({ adder }: { adder: PhotoAdder }): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { height: screenHeight } = useWindowDimensions()
  const anchor = useRef<View>(null)
  const [menu, setMenu] = useState<{ x: number; width: number; bottom: number } | null>(null)

  const open = () => {
    anchor.current?.measureInWindow((x, y, width) => {
      setMenu({ x, width, bottom: screenHeight - y + MENU_GAP })
    })
  }
  const choose = (source: 'camera' | 'gallery') => {
    setMenu(null)
    void adder.add(source)
  }

  return (
    <View ref={anchor} collapsable={false}>
      <Button
        label={adder.room <= 0 ? 'جای عکس دیگری نیست' : 'افزودن عکس'}
        variant="secondary"
        onPress={open}
        loading={adder.busy}
        disabled={adder.busy || adder.room <= 0}
      />
      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(null)} accessibilityRole="button" accessibilityLabel="بستن">
          {menu ? (
            <View style={[styles.menu, { left: menu.x, width: menu.width, bottom: menu.bottom }]}>
              <MenuRow icon="camera" label="دوربین" onPress={() => choose('camera')} theme={theme} styles={styles} />
              <View style={styles.divider} />
              <MenuRow icon="image" label="گالری" onPress={() => choose('gallery')} theme={theme} styles={styles} />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  )
}

function MenuRow({
  icon,
  label,
  onPress,
  theme,
  styles
}: {
  icon: IconName
  label: string
  onPress: () => void
  theme: Theme
  styles: ReturnType<typeof createStyles>
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Icon name={icon} size="sm" color={theme.colors.onSurface} />
      <Text style={[theme.typography('bodyMd'), styles.rowText]}>{label}</Text>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: { flex: 1 },
    menu: {
      position: 'absolute',
      paddingVertical: theme.spacing.space1,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      minHeight: theme.touchTargetMinimum,
      paddingHorizontal: theme.spacing.space4
    },
    rowPressed: { backgroundColor: theme.colors.surfaceContainerLow },
    rowText: { color: theme.colors.onSurface },
    divider: { height: 1, backgroundColor: theme.colors.outlineVariant, marginHorizontal: theme.spacing.space3 }
  })
}
