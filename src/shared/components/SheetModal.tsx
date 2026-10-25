import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { KeyboardLift } from './KeyboardAwareScroll'

/** under Jest a sheet opens and closes at once, so tests see the end state without waiting for the slide */
const ANIMATE = process.env.NODE_ENV !== 'test'
const OPEN_MS = 260
const CLOSE_MS = 200

type Props = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  backdropColor?: string
  /** a sheet with text fields rises above the keyboard */
  keyboardLift?: boolean
}

/**
 * Amin #5186: a sheet at the bottom of the screen slides up from the bottom edge and back down when it closes, while
 * the dim behind it fades. Tapping the dim or Android's back closes it. The sheet itself is the child.
 */
export function SheetModal({
  visible,
  onClose,
  children,
  backdropColor = 'rgba(15,23,42,0.45)',
  keyboardLift = false
}: Props): React.JSX.Element {
  const { height: windowHeight } = useWindowDimensions()
  const [mounted, setMounted] = useState(visible)
  const [sheetHeight, setSheetHeight] = useState(windowHeight)
  const progress = useRef(new Animated.Value(visible && !ANIMATE ? 1 : 0)).current

  useEffect(() => {
    if (visible) {
      setMounted(true)
      if (!ANIMATE) {
        progress.setValue(1)
        return
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start()
    } else if (!ANIMATE) {
      progress.setValue(0)
      setMounted(false)
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) setMounted(false)
      })
    }
  }, [visible, progress])

  const body = (
    <View style={styles.fill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: progress }]}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن" />
      </Animated.View>
      <View style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
          style={{
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }) }]
          }}
        >
          {children}
        </Animated.View>
      </View>
    </View>
  )

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {keyboardLift ? <KeyboardLift>{body}</KeyboardLift> : body}
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'flex-end' }
})
