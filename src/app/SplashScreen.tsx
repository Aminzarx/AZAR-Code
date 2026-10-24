import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  View,
  type LayoutChangeEvent
} from 'react-native'
import { useTheme } from '@shared/theme'

/** Amin #4936: at least this long, and longer until the app is really ready */
export const SPLASH_MIN_MS = 3000
// = the native splash (android/.../values(-night)/colors.xml splash_background) = the theme's background
// Amin #5055: in night mode the letters (and the dots) are light, as in drawable-night/splash_logo
const INK = { light: '#21374F', dark: '#E2E8F0' } // the colour of the «ایوان» letters
const CYCLE_MS = 900 // one pass of the «train» over the three dots
const DIM = 0.18

const logo = require('../assets/eyvan-logo.png')
const logoDark = require('../assets/eyvan-logo-dark.png')

/**
 * Amin #4936: the small logo exactly where the native splash put it, with three tiny navy dots lighting one after
 * another from right to left like a train. It keeps running until `done`, then fades away over the ready app —
 * never a blank frame and never a jump.
 */
export function SplashScreen({
  done,
  onHidden
}: {
  done: boolean
  onHidden: () => void
}): React.JSX.Element {
  const theme = useTheme()
  const ink = theme.isDark ? INK.dark : INK.light
  const run = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current
  // the native splash centres the logo on the whole screen; this view sits between the system bars, so it is moved
  // by the difference. Until it is measured it stays see-through and the native splash (same place) shows.
  const [shift, setShift] = useState<number | null>(null)
  const measure = (event: LayoutChangeEvent): void =>
    setShift(screenCentreOffset(event.nativeEvent.layout.height))

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(run, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true
      })
    )
    loop.start()
    return () => loop.stop()
  }, [run])

  useEffect(() => {
    if (!done) return
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) onHidden()
      }
    )
  }, [done, fade, onHidden])

  return (
    <Animated.View
      pointerEvents={done ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        shift === null ? null : { backgroundColor: theme.colors.background },
        { opacity: fade }
      ]}
      accessibilityLabel="ایوان"
      onLayout={measure}
    >
      <View
        style={[
          styles.centre,
          { opacity: shift === null ? 0 : 1, transform: [{ translateY: shift ?? 0 }] }
        ]}
      >
        <Image source={theme.isDark ? logoDark : logo} style={styles.logo} />
        {/* the dots hang under the centred logo, so the logo stays exactly where the native splash drew it */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            // right to left: dot 0 is the rightmost (the row is laid out left to right on purpose)
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: ink, opacity: run.interpolate(pulse(2 - i)) }]}
            />
          ))}
        </View>
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

/**
 * How far the centre of the screen is from the centre of a view of this height that starts under the status bar.
 * 0 when the view already covers the whole screen (edge to edge).
 */
export function screenCentreOffset(viewHeight: number): number {
  const screen = Dimensions.get('screen').height
  if (viewHeight >= screen - 1) return 0
  const statusBar = StatusBar.currentHeight ?? 0
  return Math.round(screen / 2 - statusBar - viewHeight / 2)
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
  root: { zIndex: 10 },
  centre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: { width: 120, height: 120 },
  dots: {
    position: 'absolute',
    top: '50%',
    marginTop: 60 + 14,
    flexDirection: 'row',
    direction: 'ltr',
    gap: 7
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 }
})
