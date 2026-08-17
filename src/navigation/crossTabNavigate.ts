import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import type { MainStackParamList } from './MainNavigator'

type TabName = 'HomeTab' | 'FilesTab' | 'MatchingTab' | 'ContractsTab' | 'ProfileTab'

/**
 * design-system.md §16 — the single source of truth for which tab owns
 * each screen, mirroring the doc's table exactly. Screens navigating to
 * each other within the same tab use plain `navigation.navigate(...)`;
 * this map/helper is only for crossing into a screen owned by a
 * different tab.
 */
const SCREEN_OWNER_TAB: Record<keyof MainStackParamList, TabName> = {
  Home: 'HomeTab',
  ReminderList: 'HomeTab',
  CreateReminder: 'HomeTab',
  ReminderDetail: 'HomeTab',
  Files: 'FilesTab',
  PropertyList: 'FilesTab',
  CreateProperty: 'FilesTab',
  PropertyDetail: 'FilesTab',
  ApplicantList: 'FilesTab',
  CreateApplicant: 'FilesTab',
  ApplicantDetail: 'FilesTab',
  Matching: 'MatchingTab',
  DealList: 'MatchingTab',
  DealDetail: 'MatchingTab',
  ContractList: 'ContractsTab',
  CreateContract: 'ContractsTab',
  ContractDetail: 'ContractsTab',
  Settings: 'ProfileTab'
}

/**
 * Navigates to a screen that may be owned by a different tab than the
 * one currently active. A bare `navigation.navigate('ScreenName')` only
 * bubbles UP to an ancestor navigator, not sideways into a sibling tab's
 * nested stack — this explicitly targets the owning tab first (switching
 * the active tab, so the tab bar and back-button history stay correct),
 * then the screen within it, per React Navigation's documented nested-
 * navigator pattern.
 */
export function navigateAcrossTabs<RouteName extends keyof MainStackParamList>(
  navigation: NavigationProp<ParamListBase>,
  screen: RouteName,
  params: MainStackParamList[RouteName]
): void {
  const tab = SCREEN_OWNER_TAB[screen]
  const parent = typeof navigation.getParent === 'function' ? navigation.getParent() : undefined
  if (parent) {
    // The parent Tab.Navigator isn't itself given a typed ParamList (its
    // routes are plain tab names holding nested stacks), so this call is
    // intentionally loosely typed — `tab`/`screen`/`params` above are
    // still fully typed against MainStackParamList at the call site.
    const navigateOnParent = parent.navigate as (name: string, params?: object) => void
    navigateOnParent(tab, { screen, params })
  } else if (params === undefined) {
    navigation.navigate(screen as never)
  } else {
    navigation.navigate(screen as string, params as object)
  }
}
