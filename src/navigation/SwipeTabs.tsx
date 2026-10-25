import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Keyboard,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent
} from 'react-native'
import {
  createNavigatorFactory,
  StackActions,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigationProp,
  type NavigatorTypeBagBase,
  type ParamListBase,
  type StaticConfig,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
  type TypedNavigator
} from '@react-navigation/native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@shared/theme'
import { TabBarButton } from './TabBarButton'
import { backSwipe, swipeTarget } from './TabSwipe'

export type SwipeTabOptions = {
  tabBarLabel?: string
  tabBarIcon?: (props: { color: string; focused: boolean }) => React.ReactNode
}

export type SwipeTabEventMap = {
  tabPress: { data: undefined; canPreventDefault: true }
}

type SwipeTabNavigation = NavigationProp<
  ParamListBase,
  string,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabOptions,
  SwipeTabEventMap
> &
  TabActionHelpers<ParamListBase>

type Props = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabOptions,
  SwipeTabEventMap,
  SwipeTabNavigation
> &
  TabRouterOptions

/** a slide between tabs, after a tap or a released swipe */
const SLIDE_MS = 240
/** past the first or the last tab the page still moves a little under the finger, then springs back */
const EDGE_RESISTANCE = 0.25

/**
 * Amin #5179: the tabs sit side by side like Telegram's: on a tab's first page the pages follow the finger as one
 * piece (the neighbour slides in with the current one), and a released swipe settles on the nearer page. A tap on
 * the tab bar slides the same way. In Persian (RTL) the next tab lies to the LEFT, as in the tab bar.
 * Amin #5182: on an inner page of a tab (a record, a form…) a swipe to the left goes back one page in that tab, until
 * the tab's first page; only there does a swipe change the tab.
 * Horizontal scrollers inside a page (filter chips, photo strips) are gesture-handler ScrollViews, so they take a
 * sideways drag first and never move the page.
 */
function SwipeTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout
}: Props): React.JSX.Element {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    SwipeTabOptions,
    SwipeTabEventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout
  })

  const theme = useTheme()
  const insets = useSafeAreaInsets()
  // the window's width until the pager has measured itself (the same on a phone: the pager is full width)
  const window = useWindowDimensions()
  const [width, setWidth] = useState(window.width)
  const keyboardOpen = useKeyboardOpen()
  // physical direction of «the next tab»: right in LTR, left in RTL
  const sign = theme.isRTL ? -1 : 1
  const base = (index: number) => -index * sign * width
  const offset = useRef(new Animated.Value(-state.index * sign * width)).current
  const indexRef = useRef(state.index)
  indexRef.current = state.index

  // the focused tab's own stack: at its first page or not
  const focusedRoute = state.routes[state.index]
  const childState = focusedRoute.state as { key?: string; index?: number } | undefined
  const atRoot = !childState || (childState.index ?? 0) === 0

  useEffect(() => {
    Animated.timing(offset, {
      toValue: base(state.index),
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, width, sign])

  const pan = usePanGesture({
    runOnJS: true,
    disableReanimated: true,
    activeOffsetX: [-20, 20],
    failOffsetY: [-15, 15],
    onUpdate: (event) => {
      if (!atRoot || width === 0) return
      const index = indexRef.current
      const pullingToNext = sign > 0 ? event.translationX < 0 : event.translationX > 0
      const hasNeighbour = pullingToNext ? index < state.routes.length - 1 : index > 0
      offset.setValue(base(index) + event.translationX * (hasNeighbour ? 1 : EDGE_RESISTANCE))
    },
    onDeactivate: (event) => {
      const index = indexRef.current
      if (!atRoot) {
        if (!event.canceled && childState?.key && backSwipe(event.translationX, event.velocityX)) {
          navigation.dispatch({ ...StackActions.pop(), target: childState.key })
        }
        return
      }
      const target = event.canceled
        ? null
        : swipeTarget(index, state.routes.length, event.translationX, event.velocityX, theme.isRTL)
      const route = target === null ? undefined : state.routes[target]
      if (route) {
        navigation.navigate(route.name)
      } else {
        Animated.timing(offset, {
          toValue: base(index),
          duration: SLIDE_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }).start()
      }
    }
  })

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width
    if (next !== width) {
      setWidth(next)
      offset.setValue(-indexRef.current * sign * next)
    }
  }

  const sceneOffsets = useMemo(
    () => state.routes.map((_, index) => Animated.add(offset, index * sign * width)),
    [offset, state.routes, sign, width]
  )

  const onTabPress = (routeKey: string, routeName: string, focused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true })
    if (!focused && !event.defaultPrevented) navigation.navigate(routeName)
  }

  return (
    <NavigationContent>
      <View style={styles.fill}>
        <GestureDetector gesture={pan}>
          <View style={styles.pager} onLayout={onLayout} collapsable={false}>
            {state.routes.map((route, index) => {
              const focused = index === state.index
              return (
                <Animated.View
                  key={route.key}
                  style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ translateX: sceneOffsets[index] }] }
                  ]}
                  pointerEvents={focused ? 'auto' : 'none'}
                  importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
                  accessibilityElementsHidden={!focused}
                >
                  {descriptors[route.key].render()}
                </Animated.View>
              )
            })}
          </View>
        </GestureDetector>
        {keyboardOpen ? null : (
          <View
            accessibilityRole="tablist"
            style={[
              styles.bar,
              {
                height: theme.layout.bottomNavHeight + insets.bottom,
                paddingBottom: insets.bottom,
                paddingTop: theme.spacing.space2,
                backgroundColor: theme.colors.surfaceContainerLowest,
                borderTopColor: theme.colors.outlineVariant
              }
            ]}
          >
            {state.routes.map((route, index) => {
              const focused = index === state.index
              const options = descriptors[route.key].options
              const color = focused
                ? theme.colors.onSecondaryContainer
                : theme.colors.onSurfaceVariant
              return (
                <TabBarButton
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarLabel}
                  onPress={() => onTabPress(route.key, route.name, focused)}
                  style={styles.tab}
                >
                  {options.tabBarIcon?.({ color, focused })}
                  <Text
                    style={[theme.typography('labelSm'), styles.label, { color }]}
                    numberOfLines={1}
                  >
                    {options.tabBarLabel}
                  </Text>
                </TabBarButton>
              )
            })}
          </View>
        )}
      </View>
    </NavigationContent>
  )
}

/** v1.3.0: the tab bar sat on top of the keyboard while typing; it hides while the keyboard is open */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return open
}

type SwipeTabTypeBag<ParamList extends ParamListBase = ParamListBase> = {
  ParamList: ParamList
  NavigatorID: string | undefined
  State: TabNavigationState<ParamList>
  ScreenOptions: SwipeTabOptions
  EventMap: SwipeTabEventMap
  NavigationList: { [RouteName in keyof ParamList]: SwipeTabNavigation }
  Navigator: typeof SwipeTabNavigator
}

export function createSwipeTabNavigator<
  const ParamList extends ParamListBase,
  const TypeBag extends NavigatorTypeBagBase = SwipeTabTypeBag<ParamList>,
  const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>
>(config?: Config): TypedNavigator<TypeBag, Config> {
  return createNavigatorFactory(SwipeTabNavigator)(config)
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pager: { flex: 1, overflow: 'hidden' },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, gap: 2 },
  label: { fontSize: 10 }
})
