import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import type { MainStackParamList } from './MainNavigator'

type TabName = 'HomeTab' | 'FilesTab' | 'MatchingTab' | 'ContractsTab' | 'ProfileTab'

/**
 * The five tab roots. Going to one of these (with no params) switches to
 * its tab, the same as tapping it in the tab bar.
 */
const TAB_ROOT: Partial<Record<keyof MainStackParamList, TabName>> = {
  Home: 'HomeTab',
  Files: 'FilesTab',
  Matching: 'MatchingTab',
  ContractList: 'ContractsTab',
  Settings: 'ProfileTab'
}

/**
 * v1.4.0 (Amin #4311): opening a record or a form never switches tabs any
 * more. Every such screen is registered in every tab's stack
 * (MainNavigator), so it is pushed onto the CURRENT tab and Back returns
 * to whatever opened it. Only a bare tab root (Home, Files, Matching with
 * no record, Contracts, Profile) switches tab, like the tab bar does.
 * The name is kept so call sites don't change.
 */
export function navigateAcrossTabs<RouteName extends keyof MainStackParamList>(
  navigation: NavigationProp<ParamListBase>,
  screen: RouteName,
  params: MainStackParamList[RouteName]
): void {
  const tab = params === undefined ? TAB_ROOT[screen] : undefined
  const parent = typeof navigation.getParent === 'function' ? navigation.getParent() : undefined
  if (tab && parent) {
    const navigateOnParent = parent.navigate as (name: string, params?: object) => void
    navigateOnParent(tab, { screen })
  } else if (params === undefined) {
    navigation.navigate(screen as never)
  } else {
    navigation.navigate(screen as string, params as object)
  }
}
