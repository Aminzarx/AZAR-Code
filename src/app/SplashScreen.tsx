import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, StyleSheet, View } from 'react-native'

/** Amin #4936: at least this long, and longer until the app is really ready */
export const SPLASH_MIN_MS = 3000
const BACKGROUND = '#F8FAFC' // = the native splash (android/.../colors.xml splash_background)
const INK = '#21374F' // the colour of the «ایوان» letters
const CYCLE_MS = 900 // one pass of the «train» over the three dots
const DIM = 0.18

const logo = require('../assets/eyvan-logo.png')

/**
 * Amin #4936: the small logo exactly where the native splash put it, with three tiny navy dots lighting one after
 * another from right to left like a train. It keeps running until `done`, then fades away over the ready app —
 * never a blank frame and never a jump.
 */
export function SplashScreen({ done, onHidden }: { done: boolean; onHidden: () => void }): React.JSX.Element {
  const run = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(run, { toValue: 1, duration: CYCLE_MS, easing: Easing.linear, useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [run])

  useEffect(() => {
    if (!done) return
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onHidden()
    })
  }, [done, fade, onHidden])

  return (
    <Animated.View
      pointerEvents={done ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      accessibilityLabel="ایوان"
    >
      <Image source={logo} style={styles.logo} />
      {/* the dots hang under the centred logo, so the logo stays exactly where the native splash drew it */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          // right to left: dot 0 is the rightmost (the row is laid out left to right on purpose)
          <Animated.View key={i} style={[styles.dot, { opacity: run.interpolate(pulse(2 - i)) }]} />
        ))}
      </View>
    </Animated.View>
  )
}

/** a soft light that runs across the dots: 4 slots per cycle (three dots + one pause), dot `slot` lit in its slot */
function pulse(slot: number) {
  const a = slot / 4
  const b = (slot + 1) / 4
  const points = [0, a, (a + b) / 2, b, 1].filter((v, k, all) => all.indexOf(v) === k)
  const values = points.map((p) => (p === (a + b) / 2 ? 1 : DIM))
  return { inputRange: points, outputRange: values, extrapolate: 'clamp' as const }
}

/** shows the splash for at least SPLASH_MIN_MS from start, until `ready`; then it fades and goes away */
export function useSplash(ready: boolean): { visible: boolean; done: boolean; hide: () => void } {
  const [minDone, setMinDone] = useState(false)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setMinDone(true), SPLASH_MIN_MS)
    return () => clearTimeout(timer)
  }, [])
  const hide = React.useCallback(() => setVisible(false), [])
  return { visible, done: ready && minDone, hide }
}

const styles = StyleSheet.create({
  root: { backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  logo: { width: 120, height: 120 },
  dots: {
    position: 'absolute',
    top: '50%',
    marginTop: 60 + 14,
    flexDirection: 'row',
    direction: 'ltr',
    gap: 7
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: INK }
})
