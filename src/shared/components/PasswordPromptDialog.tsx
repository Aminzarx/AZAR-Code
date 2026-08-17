import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'
import { TextInput } from './TextInput'

type Props = {
  visible: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  isSubmitting?: boolean
  errorMessage?: string
  onConfirm: (password: string) => void
  onCancel: () => void
}

/**
 * Same "glass" dialog shell as ConfirmDialog (design-system.md §7.9),
 * with a password field instead of a yes/no choice — currently used to
 * collect the encryption password for a database backup
 * (BackupService.createBackupFile). Clears its own field state on close
 * so a cancelled/dismissed dialog never leaves a password sitting in
 * memory in a component that stays mounted.
 */
export function PasswordPromptDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'انصراف',
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [password, setPassword] = useState('')

  function handleCancel(): void {
    setPassword('')
    onCancel()
  }

  function handleConfirm(): void {
    onConfirm(password)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      {/* RN's Modal renders in its own native window, outside the
          Activity's normal view hierarchy — AndroidManifest's
          windowSoftInputMode=adjustResize (which handles this for every
          regular screen, see FormScreenContainer's own comment) doesn't
          reach in here, so the keyboard would otherwise sit on top of the
          field with no avoidance at all. `card`'s maxHeight bounds how far
          this can push the dialog up, so on a short screen with a keyboard
          covering more than half of it, the dialog shrinks and scrolls
          internally instead of climbing off the top edge. */}
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={styles.backdropPressable}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        >
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
            <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
            <Text style={[theme.typography('bodyMd'), styles.description]}>{description}</Text>
            <TextInput
              label="رمز عبور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              errorMessage={errorMessage}
              autoFocus
            />
            <View style={styles.actions}>
              <Button
                label={cancelLabel}
                variant="secondary"
                onPress={handleCancel}
                disabled={isSubmitting}
                style={styles.action}
              />
              <Button
                label={confirmLabel}
                onPress={handleConfirm}
                loading={isSubmitting}
                disabled={password.length < 8}
                style={styles.action}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1
    },
    backdropPressable: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    },
    card: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
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
