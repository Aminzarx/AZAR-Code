import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  I18nManager,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle
} from 'react-native'

type Props = {
  children: React.ReactNode
  style?: StyleProp<TextStyle>
  accessibilityLabel?: string
  testID?: string
}

// keys that place the box in its row; they belong on the clipping box, not on the text
const LAYOUT_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'maxWidth',
  'minWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'marginHorizontal',
  'marginVertical'
] as const

const PAUSE_MS = 1500
const MS_PER_PX = 28

/**
 * v1.5.0 (Amin #4632): one line of text that, when it does not fit its box,
 * slides slowly sideways and back so the whole text can be read; text that
 * fits stays still. The full width is measured once the box has a size, by
 * an invisible copy that screen readers skip.
 */
export function MarqueeText({ children, style, accessibilityLabel, testID }: Props): React.JSX.Element {
  const [boxWidth, setBoxWidth] = useState(0)
  const [textWidth, setTextWidth] = useState(0)
  const offset = useRef(new Animated.Value(0)).current

  const { boxStyle, textStyle } = useMemo(() => {
    const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>
    const box: Record<string, unknown> = {}
    const text: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(flat)) {
      if ((LAYOUT_KEYS as readonly string[]).includes(key)) box[key] = value
      else text[key] = value
    }
    return { boxStyle: box as ViewStyle, textStyle: text as TextStyle }
  }, [style])

  const distance = Math.ceil(textWidth - boxWidth)
  const overflows = boxWidth > 0 && distance > 1

  useEffect(() => {
    offset.setValue(0)
    if (!overflows) return
    const to = I18nManager.isRTL ? distance : -distance
    const travel = Math.max(1200, distance * MS_PER_PX)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(PAUSE_MS),
        Animated.timing(offset, { toValue: to, duration: travel, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(PAUSE_MS),
        Animated.timing(offset, { toValue: 0, duration: travel, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [overflows, distance, offset])

  return (
    <View
      style={[boxStyle, styles.box, overflows && { width: boxWidth }]}
      onLayout={(event) => {
        if (!overflows) setBoxWidth(event.nativeEvent.layout.width)
      }}
      testID={testID}
    >
      {overflows ? (
        <Animated.View style={[styles.track, { width: textWidth, transform: [{ translateX: offset }] }]}>
          <Text style={textStyle} accessibilityLabel={accessibilityLabel}>
            {children}
          </Text>
        </Animated.View>
      ) : (
        <Text style={textStyle} numberOfLines={1} accessibilityLabel={accessibilityLabel}>
          {children}
        </Text>
      )}
      {boxWidth > 0 ? (
        <View
          style={styles.measure}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Text style={textStyle} onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}>
            {children}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  track: { alignSelf: 'flex-start' },
  measure: { position: 'absolute', top: 0, width: 4000, flexDirection: 'row', opacity: 0 }
})
