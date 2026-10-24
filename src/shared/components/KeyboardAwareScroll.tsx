import React, { useEffect, useRef } from 'react'
import {
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle
} from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { scrollToShow, useKeyboardOverlap } from '@shared/hooks/useKeyboardOverlap'

type Props = {
  children: React.ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
  /** a fixed bar under the scroll (the form's main button); it rides right above the keyboard */
  footer?: React.ReactNode
  footerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
}

/**
 * Amin #5057: a scrolling form the keyboard never covers. The whole area (scroll + footer) is lifted by exactly the
 * part the keyboard hides (useKeyboardOverlap — 0 where Android already shrank the window), and when the keyboard
 * opens the focused field is scrolled into the visible part. Fields focused later are kept in view by Android itself.
 *
 * The gesture-handler ScrollView (see FormScreenContainer for why): a drag that starts on a field still scrolls.
 */
export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
  footer,
  footerStyle,
  style
}: Props): React.JSX.Element {
  const keyboard = useKeyboardOverlap()
  const scrollRef = useRef<React.ElementRef<typeof ScrollView> | null>(null)
  const contentRef = useRef<View | null>(null)
  const scrollY = useRef(0)
  const viewportHeight = useRef(0)

  useEffect(() => {
    if (!keyboard.keyboardOpen) return
    // after the lift has been laid out
    const timer = setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput() as unknown as View | null
      const content = contentRef.current
      if (!input || !content || typeof input.measureLayout !== 'function') return
      input.measureLayout(
        content,
        (_x, y, _width, height) => {
          const to = scrollToShow(
            { top: y, bottom: y + height },
            { scrollY: scrollY.current, height: viewportHeight.current }
          )
          if (to !== null)
            (scrollRef.current as unknown as { scrollTo: (o: object) => void })?.scrollTo({
              y: to,
              animated: true
            })
        },
        () => undefined
      )
    }, 80)
    return () => clearTimeout(timer)
  }, [keyboard.keyboardOpen, keyboard.overlap])

  return (
    <View
      ref={keyboard.ref}
      onLayout={keyboard.onLayout}
      style={[styles.flex, style, keyboard.overlap > 0 && { paddingBottom: keyboard.overlap }]}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.grow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={32}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollY.current = event.nativeEvent.contentOffset.y
        }}
        onLayout={(event: LayoutChangeEvent) => {
          viewportHeight.current = event.nativeEvent.layout.height
        }}
      >
        {/* the content style sits on this view (the one fields are measured against) */}
        <View ref={contentRef} collapsable={false} style={[styles.grow, contentContainerStyle]}>
          {children}
        </View>
      </ScrollView>
      {footer ? <View style={footerStyle}>{footer}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } })

/**
 * Amin #5057: for a dialog or bottom sheet (inside a Modal): the whole overlay is lifted by the part the keyboard
 * hides, so the card or sheet, with its field and its button, moves up above the keyboard.
 */
export function KeyboardLift({ children }: { children: React.ReactNode }): React.JSX.Element {
  const keyboard = useKeyboardOverlap()
  return (
    <View
      ref={keyboard.ref}
      onLayout={keyboard.onLayout}
      style={[styles.flex, keyboard.overlap > 0 && { paddingBottom: keyboard.overlap }]}
    >
      {children}
    </View>
  )
}
