import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'

/** How long the post-save "ذخیره شد" flash stays visible before the header reverts to its normal label. */
const SAVED_FLASH_DURATION_MS = 1600

type Props = {
  children: React.ReactNode
  /** Screen title shown in the persistent header. Omit the header entirely by also omitting `onSave`. */
  headerTitle?: string
  /**
   * When provided, renders a persistent save action in the screen's
   * top-left corner (outside the scrollable/keyboard-avoiding area, so
   * it stays reachable even while the keyboard is open and the user has
   * scrolled past the form's own bottom submit button).
   */
  onSave?: () => void
  saveLabel?: string
  isSaving?: boolean
  /**
   * Whether the form has unsaved changes worth submitting. Defaults to
   * `true` (always enabled) for callers that don't yet track dirty state,
   * so this stays backward-compatible with every existing call site.
   * When `false`, the save action renders muted/disabled (design-system.md
   * §7.2's disabled-field treatment: `surfaceContainerLow` fill, `outline`
   * text) instead of inviting a no-op tap.
   */
  isDirty?: boolean
  /**
   * Flip this to `true` right after a save resolves successfully to show a
   * brief "ذخیره شد" flash in place of the save label. The container clears
   * it on its own after a short delay — callers don't need their own timer,
   * just leave the prop `true` (or reset it whenever, the internal flash
   * timing is what actually controls visibility).
   */
  saveSucceeded?: boolean
}

/**
 * Shared safe-area + scrollable + keyboard-aware layout for create/edit
 * forms (§6 of the forms/matching brief — keyboard was hiding the bottom
 * fields and the submit button). `behavior` is iOS-only: Android's
 * `windowSoftInputMode="adjustResize"` (AndroidManifest.xml) already
 * resizes the window when the keyboard opens, so adding
 * KeyboardAvoidingView's own resize on top of that double-adjusts and
 * makes the content jump. The extra bottom padding keeps the submit
 * button reachable past the last field even when the keyboard is open;
 * RN's TextInput already auto-scrolls itself into view inside a
 * ScrollView on focus, so no extra scroll-tracking code is needed.
 *
 * The optional header (`onSave`) sits above the `KeyboardAvoidingView`,
 * not inside the `ScrollView` — a fixed save affordance the keyboard
 * can never cover and scrolling can never carry off-screen, in addition
 * to the form's own full-width bottom submit button. Row order is
 * [title][save] in JSX; under RTL mirroring that renders the title on
 * the reading-start (right) side and the save action on the screen's
 * top-left corner, not a hardcoded `left` style.
 *
 * `ScrollView`/`Pressable` are imported from `react-native-gesture-
 * handler`, not `react-native` — on Android, plain RN `TextInput`
 * unconditionally claims the touch responder on press-down (protecting
 * its own text-selection drag), which blocks a parent RN `ScrollView`
 * from ever seeing a scroll gesture that starts on a field. gesture-
 * handler's `ScrollView` participates in its gesture-arbitration system
 * instead, so a vertical drag that begins on a text field still scrolls
 * the screen. The library is already a native dependency (wired via
 * `GestureHandlerRootView` in `App.tsx` for react-navigation), so this
 * is a drop-in swap, not a new native dependency.
 */
export function FormScreenContainer({
  children,
  headerTitle,
  onSave,
  saveLabel = 'ذخیره',
  isSaving,
  isDirty = true,
  saveSucceeded = false
}: Props): React.JSX.Element {
  const theme = useTheme()
  const isDisabled = Boolean(isSaving) || !isDirty
  const styles = createStyles(theme, isDisabled)
  const [showSavedFlash, setShowSavedFlash] = useState(false)

  useEffect(() => {
    if (!saveSucceeded) {
      return
    }
    setShowSavedFlash(true)
    const timer = setTimeout(() => setShowSavedFlash(false), SAVED_FLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [saveSucceeded])

  return (
    <SafeAreaView style={styles.safeArea}>
      {onSave ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          accessibilityState={{ disabled: isDisabled }}
          // Guarding inside the handler (not just via the `disabled` prop)
          // keeps this reliably no-op regardless of how the underlying
          // gesture-handler Pressable wires up disabled-state press
          // suppression at the native/gesture level.
          onPress={() => {
            if (!isDisabled) {
              onSave()
            }
          }}
          disabled={isDisabled}
          style={styles.header}
        >
          {headerTitle ? (
            <Text
              style={[theme.typography('titleSm'), styles.headerTitle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {headerTitle}
            </Text>
          ) : (
            <Text />
          )}
          {isSaving ? (
            <ActivityIndicator color={theme.colors.onSecondaryContainer} size="small" />
          ) : showSavedFlash ? (
            <View style={styles.savedFlash}>
              <Icon name="check" size="xs" color={theme.colors.onSuccessContainer} />
              <Text style={[theme.typography('labelMd'), styles.savedFlashLabel]}>ذخیره شد</Text>
            </View>
          ) : (
            <Text style={[theme.typography('labelMd'), styles.saveLabel]}>{saveLabel}</Text>
          )}
        </Pressable>
      ) : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme, isDisabled: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    flex: {
      flex: 1
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingVertical: theme.spacing.space3,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    headerTitle: {
      color: theme.colors.onSurface,
      flexShrink: 1,
      marginEnd: theme.spacing.space3
    },
    // design-system.md §7.2's disabled-field treatment (surfaceContainerLow
    // fill, outline text) reused here so "can't save yet" reads the same
    // way a disabled text field does, instead of a one-off button style.
    saveLabel: {
      color: isDisabled ? theme.colors.outline : theme.colors.onSecondaryContainer,
      backgroundColor: isDisabled
        ? theme.colors.surfaceContainerLow
        : theme.colors.secondaryContainer,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      overflow: 'hidden'
    },
    savedFlash: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.successContainer
    },
    savedFlashLabel: {
      color: theme.colors.onSuccessContainer
    },
    content: {
      padding: theme.spacing.space6,
      paddingBottom: theme.spacing.space16,
      gap: theme.spacing.space4
    }
  })
}
