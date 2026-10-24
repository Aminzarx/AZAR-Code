import React from 'react'
import { StyleSheet, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'

/** how far (dp) or how fast (dp/s) a horizontal swipe has to go before it changes the tab */
const SWIPE_DISTANCE = 60
const SWIPE_VELOCITY = 500

type SceneInterpolator = NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']>

/**
 * Amin #5046: which tab a finished horizontal swipe leads to, or null to stay. The tabs follow the tab bar: in Persian
 * (RTL) the next tab sits to the LEFT of the current one, so pulling the page to the right (a positive translationX)
 * brings it in, as with a page turned in a Persian book; in LTR it is the other way round. No wrap-around at the ends.
 */
export function swipeTarget(
  index: number,
  count: number,
  translationX: number,
  velocityX: number,
  isRTL: boolean
): number | null {
  const far = Math.abs(translationX) >= SWIPE_DISTANCE
  const fast =
    Math.abs(velocityX) >= SWIPE_VELOCITY && Math.sign(velocityX) === Math.sign(translationX)
  if (!far && !fast) return null
  const towardNext = isRTL ? translationX > 0 : translationX < 0
  const target = index + (towardNext ? 1 : -1)
  return target >= 0 && target < count ? target : null
}

type TabNavigation = {
  getParent: () => unknown
  getState: () => TabNavigationState<ParamListBase>
  navigate: (name: string) => void
}

/**
 * Amin #5046: swiping left/right on a tab's first page moves to the neighbouring tab. Only on the tab's root page (a
 * record or a form opened inside the tab keeps every horizontal gesture of its own: galleries, sliders, swipe
 * actions…), and only for a clearly horizontal drag (a vertical scroll or a small sideways wobble never counts). A
 * horizontal scroller inside the page wins too: it takes the touch first, at a much smaller distance (see the
 * gesture-handler ScrollView in ContractListScreen).
 */
export function TabSwipe({
  navigation,
  atRoot,
  isRTL,
  children
}: {
  navigation: TabNavigation
  atRoot: boolean
  isRTL: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const pan = usePanGesture({
    enabled: atRoot,
    runOnJS: true,
    disableReanimated: true,
    activeOffsetX: [-25, 25],
    failOffsetY: [-15, 15],
    onDeactivate: (event) => {
      if (event.canceled) return
      const state = navigation.getState()
      const target = swipeTarget(
        state.index,
        state.routes.length,
        event.translationX,
        event.velocityX,
        isRTL
      )
      const route = target === null ? undefined : state.routes[target]
      if (route) navigation.navigate(route.name)
    }
  })
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  )
}

/**
 * The tab change slides with the swipe's direction: the new page comes in from the side the finger pulled it from.
 * Same as bottom-tabs' own «shift», mirrored for RTL (the stock one always slides as in LTR).
 */
export function shiftFor(isRTL: boolean): SceneInterpolator {
  const edge = isRTL ? -50 : 50
  return ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-edge, 0, edge]
          })
        }
      ]
    }
  })
}

const styles = StyleSheet.create({ fill: { flex: 1 } })
