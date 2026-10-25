import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'
import { MarqueeText } from './MarqueeText'
import { SheetModal } from './SheetModal'

type Props = {
  visible: boolean
  /** the row's own name, so the user sees which record the action is for */
  title: string
  onDelete: () => void
  onClose: () => void
}

/**
 * v1.4.0 (Amin #4315): the sheet a long-press on any list row opens; it slides up (#5186).
 * One action for now, «حذف», beside «انصراف»; it asks for confirmation next (ConfirmDialog)
 * and the delete itself can be undone from the snackbar.
 */
export function RowActionSheet({ visible, title, onDelete, onClose }: Props): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme, insets.bottom)
  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <MarqueeText style={[theme.typography('titleSm'), styles.title]}>{title}</MarqueeText>
        {/* Amin #5186: the two buttons side by side on one line */}
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="انصراف"
            onPress={onClose}
            style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
          >
            <Icon name="close" size="sm" color={theme.colors.onSurfaceVariant} />
            <Text style={[theme.typography('labelMd'), styles.cancelLabel]}>انصراف</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="حذف"
            onPress={onDelete}
            style={({ pressed }) => [styles.button, styles.delete, pressed && styles.pressed]}
          >
            <Icon name="trash" size="sm" color={theme.colors.onError} />
            <Text style={[theme.typography('labelMd'), styles.deleteLabel]}>حذف</Text>
          </Pressable>
        </View>
      </View>
    </SheetModal>
  )
}

function createStyles(theme: Theme, bottomInset: number) {
  return StyleSheet.create({
    sheet: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderTopLeftRadius: theme.radius.extraLarge,
      borderTopRightRadius: theme.radius.extraLarge,
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingTop: theme.spacing.space3,
      paddingBottom: theme.spacing.space4 + bottomInset,
      gap: theme.spacing.space1
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outlineVariant,
      marginBottom: theme.spacing.space2
    },
    title: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.space2
    },
    buttons: { flexDirection: 'row', gap: theme.spacing.space3 },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.space2,
      minHeight: theme.touchTargetMinimum,
      borderRadius: theme.radius.medium
    },
    cancel: { backgroundColor: theme.colors.surfaceContainerLow },
    delete: { backgroundColor: theme.colors.error },
    pressed: { opacity: 0.85 },
    deleteLabel: { color: theme.colors.onError },
    cancelLabel: { color: theme.colors.onSurface }
  })
}
