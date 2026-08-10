import React from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'

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
  isSaving
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <SafeAreaView style={styles.safeArea}>
      {onSave ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          onPress={onSave}
          disabled={isSaving}
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

function createStyles(theme: Theme) {
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
    saveLabel: {
      color: theme.colors.onSecondaryContainer,
      backgroundColor: theme.colors.secondaryContainer,
      paddingHorizontal: theme.spacing.space4,
      paddingVertical: theme.spacing.space2,
      borderRadius: theme.radius.full,
      overflow: 'hidden'
    },
    content: {
      padding: theme.spacing.space6,
      paddingBottom: theme.spacing.space16,
      gap: theme.spacing.space4
    }
  })
}
