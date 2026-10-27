import React, { useEffect } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { DashboardScreen } from '@features/dashboard/DashboardScreen'
import { FilesScreen } from '@features/files/screens/FilesScreen'
import { PropertyListScreen } from '@features/property/screens/PropertyListScreen'
import { CreatePropertyScreen } from '@features/property/screens/CreatePropertyScreen'
import { PropertyDetailScreen } from '@features/property/screens/PropertyDetailScreen'
import { ApplicantListScreen } from '@features/applicant/screens/ApplicantListScreen'
import { CreateApplicantScreen } from '@features/applicant/screens/CreateApplicantScreen'
import { ApplicantDetailScreen } from '@features/applicant/screens/ApplicantDetailScreen'
import { MatchingScreen } from '@features/matching/screens/MatchingScreen'
import { DealListScreen } from '@features/deal/screens/DealListScreen'
import { DealDetailScreen } from '@features/deal/screens/DealDetailScreen'
import { ReminderListScreen } from '@features/reminder/screens/ReminderListScreen'
import { CreateReminderScreen } from '@features/reminder/screens/CreateReminderScreen'
import { ReminderDetailScreen } from '@features/reminder/screens/ReminderDetailScreen'
import { ContractListScreen } from '@features/contract/screens/ContractListScreen'
import { CreateContractScreen } from '@features/contract/screens/CreateContractScreen'
import { ContractDetailScreen } from '@features/contract/screens/ContractDetailScreen'
import { SettingsScreen } from '@features/settings/screens/SettingsScreen'
import { ProfileScreen } from '@features/settings/screens/ProfileScreen'
import { ChangePhoneScreen } from '@features/settings/screens/ChangePhoneScreen'
import { BuyTokensScreen } from '@features/settings/screens/BuyTokensScreen'
import { PersonalizeScreen } from '@features/settings/screens/PersonalizeScreen'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from '@shared/components'
import { withLicence } from '@features/licence/LicenceLocked'
import { getFocusedRouteNameFromRoute, StackActions, useIsFocused, type RouteProp, type ParamListBase } from '@react-navigation/native'
import { createSwipeTabNavigator } from './SwipeTabs'
import { setScreenshotsAllowed } from '@infrastructure/security/screenshots'

export type MainStackParamList = {
  Home: undefined
  Files: undefined
  // Still real, registered routes (not just a type) — Dashboard's stat
  // cards link straight to a plain filtered list via these, independent
  // of the Files tab's segmented-control entry point.
  PropertyList: undefined
  /** Navid 2026-10-27: a Divar link shared into EYVAN opens a new file filled from that post */
  CreateProperty: { divarLink?: string } | undefined
  PropertyDetail: { propertyId: string }
  ApplicantList: undefined
  CreateApplicant: undefined
  ApplicantDetail: { applicantId: string }
  Matching: { propertyId?: string; applicantId?: string } | undefined
  DealList: undefined
  DealDetail: { dealId: string }
  ReminderList: undefined
  CreateReminder:
    | { propertyId?: string; applicantId?: string; dealId?: string; title?: string; date?: string }
    | undefined
  ReminderDetail: { reminderId: string }
  ContractList: undefined
  // Amin #5408: no params = a contract started from the contracts list; the parties are picked on the form
  CreateContract: { propertyId?: string; applicantId?: string; dealId?: string } | undefined
  ContractDetail: { contractId: string }
  Settings: undefined
  Profile: undefined
  ChangePhone: undefined
  /** Amin #5245: buying tokens; `receipts` opens only the receipts of earlier purchases */
  BuyTokens: { receipts?: boolean } | undefined
  /** Amin #5308: theme and light/dark */
  Personalize: undefined
}

const Stack = createNativeStackNavigator<MainStackParamList>()
const Tab = createSwipeTabNavigator()

type TabName = 'HomeTab' | 'FilesTab' | 'MatchingTab' | 'ContractsTab' | 'ProfileTab'

const TAB_LABELS: Record<TabName, string> = {
  HomeTab: 'خانه',
  FilesTab: 'فایل‌ها',
  MatchingTab: 'تطبیق',
  ContractsTab: 'قراردادها',
  // Amin #4906: «من» became «تنظیمات» (the subscription lives there)
  ProfileTab: 'تنظیمات'
}

const TAB_ICONS: Record<TabName, IconName> = {
  HomeTab: 'home',
  FilesTab: 'files',
  MatchingTab: 'matching',
  ContractsTab: 'contract',
  // Amin #4906: the tab is «تنظیمات» now, with the gear
  ProfileTab: 'settings'
}

/**
 * v1.4.0 (Amin #4311 «از هر مسیری که کاربر وارد اون بخش شده به بخش های
 * قبل برگرده»): every record and form screen is registered in EVERY tab's
 * stack, so opening a property from a deal, a deal from Home, a contract
 * from a deal… pushes it onto the tab you are in. Back (the header button
 * or Android's) then retraces exactly the way you came, and the tab bar
 * never jumps. Each tab keeps its own root as the first screen; re-tapping
 * the active tab pops it back to that root (native-stack's tabPress
 * behaviour). Only the tab roots themselves switch tabs (see
 * crossTabNavigate.ts).
 */
// Amin #4906: after the licence ends, adding files, matching and the whole contract section are closed; every
// other screen stays open for reading (their edit actions follow useLicence()).
const LockedCreateProperty = withLicence(CreatePropertyScreen, 'ثبت فایل تازه')
const LockedCreateApplicant = withLicence(CreateApplicantScreen, 'ثبت متقاضی تازه')
const LockedMatching = withLicence(MatchingScreen, 'تطبیق')
const LockedCreateReminder = withLicence(CreateReminderScreen, 'یادآوری تازه')
const LockedContractList = withLicence(ContractListScreen, 'بخش قراردادها')
const LockedCreateContract = withLicence(CreateContractScreen, 'بخش قراردادها')
const LockedContractDetail = withLicence(ContractDetailScreen, 'بخش قراردادها')

const SHARED_SCREENS: [keyof MainStackParamList, React.ComponentType<any>][] = [
  ['PropertyList', PropertyListScreen],
  ['CreateProperty', LockedCreateProperty],
  ['PropertyDetail', PropertyDetailScreen],
  ['ApplicantList', ApplicantListScreen],
  ['CreateApplicant', LockedCreateApplicant],
  ['ApplicantDetail', ApplicantDetailScreen],
  ['Matching', LockedMatching],
  ['DealList', DealListScreen],
  ['DealDetail', DealDetailScreen],
  ['ReminderList', ReminderListScreen],
  ['Profile', ProfileScreen],
  ['ChangePhone', ChangePhoneScreen],
  ['BuyTokens', BuyTokensScreen],
  ['Personalize', PersonalizeScreen],
  ['CreateReminder', LockedCreateReminder],
  ['ReminderDetail', ReminderDetailScreen],
  ['ContractList', LockedContractList],
  ['CreateContract', LockedCreateContract],
  ['ContractDetail', LockedContractDetail]
]

/** Amin #5162: screenshots are allowed only in the Settings section (its first page and the pages it opens) */
const SETTINGS_PAGES = new Set<string>(['Settings', 'Profile', 'ChangePhone', 'BuyTokens', 'Personalize'])

function makeStack(root: keyof MainStackParamList, RootScreen: React.ComponentType<any>) {
  return function TabStack({
    route,
    navigation
  }: {
    route: RouteProp<ParamListBase>
    navigation: {
      dispatch: (action: object) => void
      getState: () => { routes: { key: string; state?: { key?: string; index?: number } }[] }
    }
  }): React.JSX.Element {
    const isTabFocused = useIsFocused()
    const focused = getFocusedRouteNameFromRoute(route) ?? root
    const inSettings = root === 'Settings' && isTabFocused && SETTINGS_PAGES.has(focused)
    useEffect(() => {
      if (root !== 'Settings') return
      setScreenshotsAllowed(inSettings)
      return () => setScreenshotsAllowed(false)
    }, [inSettings])
    // Amin #5190: the Settings tab always opens on its first page; leaving it takes it back there. The stack's state
    // is read from the tab navigator: the `route` prop does not carry it (react-navigation 7 keeps it out of sight).
    useEffect(() => {
      if (root !== 'Settings' || isTabFocused) return
      const stack = navigation.getState().routes.find((r) => r.key === route.key)?.state
      if (stack?.key && (stack.index ?? 0) > 0) {
        navigation.dispatch({ ...StackActions.popToTop(), target: stack.key })
      }
    }, [isTabFocused, navigation, route.key])
    return (
      // Amin #5186: a new page inside a section slides in from the left and slides back out to the left
      <Stack.Navigator initialRouteName={root} screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
        <Stack.Screen name={root} component={RootScreen} />
        {SHARED_SCREENS.filter(([name]) => name !== root).map(([name, component]) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    )
  }
}

const HomeStack = makeStack('Home', DashboardScreen)
const FilesStack = makeStack('Files', FilesScreen)
const MatchingStack = makeStack('Matching', LockedMatching)
const ContractsStack = makeStack('ContractList', LockedContractList)
const ProfileStack = makeStack('Settings', SettingsScreen)

/**
 * design-system.md §7.5 (v2.7.2) — a compact pill behind just the icon
 * (Material 3's "active indicator" pattern) instead of the previous
 * `tabBarActiveBackgroundColor`, which filled the *entire* tab segment's
 * full height/width — a much blunter, less refined active state.
 */
function makeTabIcon(name: IconName) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    const theme = useTheme()
    const styles = createTabIconStyles(theme)
    return (
      // Amin #5296: never flattened, so the round corners stay when the tab turns active (seen square on 1.5.3)
      <View collapsable={false} style={[styles.pill, focused && styles.pillActive]}>
        <Icon name={name} size="sm" color={color} />
      </View>
    )
  }
}

function createTabIconStyles(theme: Theme) {
  return StyleSheet.create({
    pill: {
      width: 56,
      height: 32,
      // Amin #5296: half the height, not radius.full (9999), which some Android builds draw with square corners
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center'
    },
    pillActive: {
      backgroundColor: theme.colors.secondaryContainer
    }
  })
}

/**
 * Rendered once a session exists (see RootNavigator). Bottom tab bar per
 * design-system.md §7.5: 5 items (Home, Files, Matching, Contracts,
 * Profile), label-sm-mobile labels, active state = secondary-container
 * fill + filled icon. Uses the shared Icon component (see Icon.tsx for
 * why it's hand-drawn rather than Material Symbols).
 */
export function MainNavigator(): React.JSX.Element {
  // Amin #5179/#5182: the tab bar, the Telegram-like sliding pages and the swipe back live in SwipeTabs
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="HomeTab"
        options={{ tabBarLabel: TAB_LABELS.HomeTab, tabBarIcon: makeTabIcon(TAB_ICONS.HomeTab) }}
        component={HomeStack}
      />
      <Tab.Screen
        name="FilesTab"
        options={{ tabBarLabel: TAB_LABELS.FilesTab, tabBarIcon: makeTabIcon(TAB_ICONS.FilesTab) }}
        component={FilesStack}
      />
      <Tab.Screen
        name="MatchingTab"
        options={{
          tabBarLabel: TAB_LABELS.MatchingTab,
          tabBarIcon: makeTabIcon(TAB_ICONS.MatchingTab)
        }}
        component={MatchingStack}
      />
      <Tab.Screen
        name="ContractsTab"
        options={{
          tabBarLabel: TAB_LABELS.ContractsTab,
          tabBarIcon: makeTabIcon(TAB_ICONS.ContractsTab)
        }}
        component={ContractsStack}
      />
      <Tab.Screen
        name="ProfileTab"
        options={{
          tabBarLabel: TAB_LABELS.ProfileTab,
          tabBarIcon: makeTabIcon(TAB_ICONS.ProfileTab)
        }}
        component={ProfileStack}
      />
    </Tab.Navigator>
  )
}
