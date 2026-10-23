import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  /** v1.3.0: the apply button says what it will show, e.g. «نمایش ۱۲ فایل». */
  applyLabel?: string
}

// v2.9.4 — the v2.9.2 drag-to-resize handle was reported as unwanted
// ("cancel the up/down movement"); reverted to a fixed height ratio of
// the window, still generous enough that filter content rarely needs to
// scroll. Ratios, not fixed px, so this scales across phoneBreakpoints
// (§13).
// v1.3.0: 0.75 so four filter groups fit without scrolling on most phones.
const HEIGHT_RATIO = 0.75

/**
 * design-system.md §7.9's "no new dependency" stance, reused here for
 * the list-screen filter affordance — still no dedicated bottom-sheet
 * library. A fixed-height "glass" sheet (matching ConfirmDialog's own
 * translucent-card treatment) with a close (×) button beside the title
 * and a hairline separating the header from the scrollable filter body.
 * `useSafeAreaInsets` pads the action row so it clears the phone's own
 * gesture-nav bar instead of sitting flush against/under it.
 */
export function FilterSheet({
  visible,
  title,
  children,
  hasActiveFilters,
  onApply,
  onClear,
  onClose,
  applyLabel = 'اعمال فیلتر'
}: Props): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme, insets.bottom)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="بستن"
      >
        <View
          style={styles.sheet}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          {/* v1.3.0 (design batch 2): handle, title and «پاک کردن همه» as in
              the approved mockup; the backdrop and Android back still close. */}
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="پاک کردن همه"
              accessibilityState={{ disabled: !hasActiveFilters }}
              onPress={onClear}
              disabled={!hasActiveFilters}
              hitSlop={theme.spacing.space2}
            >
              <Text
                style={[
                  theme.typography('labelMd'),
                  hasActiveFilters ? styles.clear : styles.clearDisabled
                ]}
              >
                پاک کردن همه
              </Text>
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
          <View style={styles.actions}>
            <Button label={applyLabel} onPress={onApply} style={styles.action} />
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme, bottomInset: number) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      justifyContent: 'flex-end'
    },
    sheet: {
      width: '100%',
      height: `${HEIGHT_RATIO * 100}%`,
      maxWidth: theme.component.bottomSheet.maxWidthDesktop,
      alignSelf: 'center',
      borderTopLeftRadius: theme.component.bottomSheet.radiusCompact,
      borderTopRightRadius: theme.component.bottomSheet.radiusCompact,
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space5,
      paddingBottom: theme.spacing.space4 + bottomInset,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      ...theme.elevation.level4
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.space4
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    handle: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outline,
      alignSelf: 'center',
      marginBottom: theme.spacing.space4
    },
    clear: {
      color: theme.colors.onSurfaceVariant
    },
    clearDisabled: {
      color: theme.colors.placeholder
    },
    body: {
      flex: 1
    },
    bodyContent: {
      gap: theme.spacing.space4
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space4
    },
    action: {
      flex: 1
    }
  })
}
