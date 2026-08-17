import React, { useRef } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
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

// v2.9.2 — per explicit direction the sheet should open higher up the
// screen and let the user drag it taller/shorter themselves, instead of
// a fixed content-driven height sitting low. Ratios of window height,
// not fixed px, so this scales across phoneBreakpoints (§13).
const DEFAULT_HEIGHT_RATIO = 0.55
const MIN_HEIGHT_RATIO = 0.35
const MAX_HEIGHT_RATIO = 0.92

/**
 * design-system.md §7.9's "no new dependency" stance, reused here for
 * the list-screen filter affordance. Still no dedicated bottom-sheet
 * *library* — v2.9.2 adds real drag-to-resize using RN's own
 * `PanResponder`/`Animated` (already used elsewhere in the app), not a
 * new package. The sheet's height (not just its content) is now an
 * `Animated.Value` the drag handle directly manipulates, clamped between
 * `MIN_HEIGHT_RATIO` and `MAX_HEIGHT_RATIO` of the window height; the
 * body scrolls internally so filter content is never clipped regardless
 * of the sheet's current height.
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
  const windowHeight = Dimensions.get('window').height
  const minHeight = windowHeight * MIN_HEIGHT_RATIO
  const maxHeight = windowHeight * MAX_HEIGHT_RATIO
  const defaultHeight = windowHeight * DEFAULT_HEIGHT_RATIO

  const sheetHeight = useRef(new Animated.Value(defaultHeight)).current
  const heightAtGestureStart = useRef(defaultHeight)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        heightAtGestureStart.current = (sheetHeight as unknown as { __getValue: () => number })
          // React Native's Animated.Value doesn't expose a typed public
          // getter — __getValue is the documented escape hatch used
          // internally by Animated itself for exactly this case (reading
          // the current value to seed a new gesture).
          .__getValue()
      },
      onPanResponderMove: (_event, gesture) => {
        // Dragging the handle UP (negative dy) should make the sheet
        // TALLER, so height grows by -dy.
        const nextHeight = heightAtGestureStart.current - gesture.dy
        sheetHeight.setValue(Math.min(maxHeight, Math.max(minHeight, nextHeight)))
      },
      onPanResponderRelease: () => {
        heightAtGestureStart.current = (
          sheetHeight as unknown as { __getValue: () => number }
        ).__getValue()
      }
    })
  ).current

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="بستن"
      >
        <Animated.View
          style={[styles.sheet, { height: sheetHeight }]}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
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
        </Animated.View>
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
      paddingHorizontal: theme.spacing.space6,
      paddingBottom: theme.spacing.space8,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      ...theme.elevation.level4
    },
    // A generous touch area around the visual handle — the whole strip
    // is draggable, not just the thin pill itself (§8 touch targets).
    handleArea: {
      minHeight: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    },
    handle: {
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
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end',
      marginBottom: theme.spacing.space4
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
