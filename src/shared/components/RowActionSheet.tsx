import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'

type Props = {
  visible: boolean
  /** the row's own name, so the user sees which record the action is for */
  title: string
  onDelete: () => void
  onClose: () => void
}

/**
 * v1.4.0 (Amin #4315): the sheet a long-press on any list row opens.
 * One action for now, «حذف»; it asks for confirmation next (ConfirmDialog)
 * and the delete itself can be undone from the snackbar.
 */
export function RowActionSheet({ visible, title, onDelete, onClose }: Props): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme, insets.bottom)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن">
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={[theme.typography('titleSm'), styles.title]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="حذف"
            onPress={onDelete}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.iconWrap}>
              <Icon name="trash" size="sm" color={theme.colors.error} />
            </View>
            <Text style={[theme.typography('bodyLg'), styles.deleteLabel]}>حذف</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="انصراف"
            onPress={onClose}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.iconWrap}>
              <Icon name="close" size="sm" color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={[theme.typography('bodyLg'), styles.cancelLabel]}>انصراف</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme, bottomInset: number) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15,23,42,0.45)'
    },
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingVertical: theme.spacing.space3,
      borderRadius: theme.radius.large
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceContainerLow
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceContainerLow
    },
    deleteLabel: {
      color: theme.colors.error
    },
    cancelLabel: {
      color: theme.colors.onSurface
    }
  })
}
