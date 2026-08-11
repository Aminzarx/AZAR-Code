import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'

type Props = {
  visible: boolean
  title: string
  children: React.ReactNode
  /** Whether any filter is currently applied — enables the "clear" action. */
  hasActiveFilters: boolean
  onApply: () => void
  onClear: () => void
  onClose: () => void
}

/**
 * design-system.md §7.9's "no new dependency" stance, reused here for
 * the list-screen filter affordance (§12 of the brief, scoped down — see
 * PropertyListScreen/ApplicantListScreen for what's actually offered).
 * No dedicated bottom-sheet primitive exists in this app yet, so this is
 * a bottom-anchored `Modal` + translucent "glass" card, the same
 * presentation language as `ConfirmDialog` — not a new gesture-driven
 * sheet component, per the brief's explicit "don't pull in a new
 * dependency" instruction.
 */
export function FilterSheet({
  visible,
  title,
  children,
  hasActiveFilters,
  onApply,
  onClear,
  onClose
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="بستن"
      >
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          <View style={styles.body}>{children}</View>
          <View style={styles.actions}>
            <Button
              label="پاک کردن"
              variant="secondary"
              onPress={onClear}
              disabled={!hasActiveFilters}
              style={styles.action}
            />
            <Button label="اعمال فیلتر" onPress={onApply} style={styles.action} />
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
      justifyContent: 'flex-end'
    },
    sheet: {
      width: '100%',
      maxWidth: theme.component.bottomSheet.maxWidthDesktop,
      alignSelf: 'center',
      borderTopLeftRadius: theme.component.bottomSheet.radiusCompact,
      borderTopRightRadius: theme.component.bottomSheet.radiusCompact,
      padding: theme.spacing.space6,
      paddingBottom: theme.spacing.space8,
      gap: theme.spacing.space4,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      ...theme.elevation.level4
    },
    handle: {
      alignSelf: 'center',
      width: theme.component.bottomSheet.handleWidth,
      height: theme.component.bottomSheet.handleHeight,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.outlineVariant
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    body: {
      gap: theme.spacing.space4
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
