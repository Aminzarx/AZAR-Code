import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'

type Props = {
  visible: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  /** Renders the confirm action as `destructive` (red) instead of `primary` — for irreversible actions. */
  destructive?: boolean
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * design-system.md §7.9 — the shared confirmation/destructive-action
 * dialog. Replaces the OS-native `Alert.alert` used elsewhere in the app
 * (logout, delete record) with an in-app "glass" card: a translucent
 * surface over a dimmed backdrop, a soft light border standing in for a
 * glass edge highlight, and a large-blur shadow — deliberately NOT a
 * real blurred backdrop (no native blur library is bundled, consistent
 * with the app's zero-extra-native-dependency stance during a period
 * where the Android build itself was fragile; §6 makes the same call
 * for icons). Tapping the backdrop cancels, same as the native Alert.
 */
export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'انصراف',
  destructive,
  isConfirming,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      >
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          <Text style={[theme.typography('bodyMd'), styles.description]}>{description}</Text>
          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={isConfirming}
              style={styles.action}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
              loading={isConfirming}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    },
    card: {
      width: '100%',
      // design-tokens.json's `component.bottomSheet.maxWidthDesktop` —
      // not yet ported into tokens.ts's componentTokens, so inlined here.
      maxWidth: 480,
      borderRadius: theme.radius.extraLarge,
      padding: theme.spacing.space6,
      gap: theme.spacing.space3,
      backgroundColor: 'rgba(255, 255, 255, 0.86)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      ...theme.elevation.level4
    },
    title: {
      color: theme.colors.onSurface
    },
    description: {
      color: theme.colors.onSurfaceVariant
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space2
    },
    action: {
      flex: 1
    }
  })
}
