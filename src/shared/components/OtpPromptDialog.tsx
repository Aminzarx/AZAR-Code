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
import { OtpInput } from './OtpInput'

type Props = {
  visible: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  isSubmitting?: boolean
  errorMessage?: string
  onConfirm: (code: string) => void
  onCancel: () => void
}

const CODE_LENGTH = 6

/**
 * Same "glass" dialog shell as ConfirmDialog/PasswordPromptDialog
 * (design-system.md §7.9), with the 6-box OTP entry instead of a yes/no
 * choice or a password field — for actions that need a fresh SMS-code
 * confirmation on top of an already-active session (currently: account
 * deletion). Clears its own code state on close, same reasoning as
 * PasswordPromptDialog.
 */
export function OtpPromptDialog({
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
  const [code, setCode] = useState('')

  function handleCancel(): void {
    setCode('')
    onCancel()
  }

  function handleConfirm(): void {
    onConfirm(code)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      {/* See PasswordPromptDialog's comment — Modal renders outside the
          normal view hierarchy, so it needs its own explicit keyboard
          avoidance; `card`'s maxHeight keeps it from climbing off the top
          edge on a short screen. */}
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
            <OtpInput value={code} onChangeValue={setCode} disabled={isSubmitting} />
            {errorMessage ? (
              <Text style={[theme.typography('bodySm'), styles.errorText]}>{errorMessage}</Text>
            ) : null}
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
                disabled={code.length < CODE_LENGTH}
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
    errorText: {
      color: theme.colors.error,
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
