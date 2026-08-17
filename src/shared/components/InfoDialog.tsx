import React from 'react'
import { Modal, Pressable, StyleSheet, Text } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'

type Props = {
  visible: boolean
  title: string
  description: string
  confirmLabel?: string
  onDismiss: () => void
}

/**
 * Same "glass" dialog shell as ConfirmDialog (design-system.md §7.9), but
 * for a single acknowledgement rather than a yes/no choice — e.g.
 * confirming a backup restore finished, where there is nothing left to
 * choose between, only to acknowledge before moving on.
 */
export function InfoDialog({
  visible,
  title,
  description,
  confirmLabel = 'متوجه شدم',
  onDismiss
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={confirmLabel}
      >
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          <Text style={[theme.typography('bodyMd'), styles.description]}>{description}</Text>
          <Button label={confirmLabel} onPress={onDismiss} style={styles.action} />
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
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    action: {
      marginTop: theme.spacing.space2
    }
  })
}
