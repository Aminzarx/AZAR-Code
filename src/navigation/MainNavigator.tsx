import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from '@shared/components'
import { TabBarButton } from './TabBarButton'

export type MainStackParamList = {
  Home: undefined
  Files: undefined
  // Still real, registered routes (not just a type) — Dashboard's stat
  // cards link straight to a plain filtered list via these, independent
  // of the Files tab's segmented-control entry point.
  PropertyList: undefined
  CreateProperty: undefined
  PropertyDetail: { propertyId: string }
  ApplicantList: undefined
  CreateApplicant: undefined
  ApplicantDetail: { applicantId: string }
  Matching: { propertyId?: string; applicantId?: string } | undefined
  DealList: undefined
  DealDetail: { dealId: string }
  ReminderList: undefined
  CreateReminder: { propertyId?: string; applicantId?: string; dealId?: string } | undefined
  ReminderDetail: { reminderId: string }
  ContractList: undefined
  CreateContract: { propertyId: string; applicantId: string; dealId?: string }
  ContractDetail: { contractId: string }
  Settings: undefined
}

const Stack = createNativeStackNavigator<MainStackParamList>()
const Tab = createBottomTabNavigator()

type TabName = 'HomeTab' | 'FilesTab' | 'MatchingTab' | 'ContractsTab' | 'ProfileTab'

const TAB_LABELS: Record<TabName, string> = {
  HomeTab: 'خانه',
  FilesTab: 'فایل‌ها',
  MatchingTab: 'تطبیق',
  ContractsTab: 'قراردادها',
  ProfileTab: 'پروفایل'
}

const TAB_ICONS: Record<TabName, IconName> = {
  HomeTab: 'home',
  FilesTab: 'files',
  MatchingTab: 'matching',
  ContractsTab: 'contract',
  // Was 'settings' (a bare circle+dot that reads as neither a gear nor a
  // person) — the Profile tab needs to look like an account, and the icon
  // set already has a proper minimal person glyph, just wasn't wired here.
  ProfileTab: 'person'
}

/**
 * design-system.md §16 — each screen is registered in exactly ONE tab's
 * stack (never duplicated across all five, as it used to be). This is
 * what makes `navigation.navigate('X')` called from any screen correctly
 * switch to the tab that owns 'X' — React Navigation's nested-navigator
 * bubbling finds it there — instead of pushing it onto whichever tab
 * happened to be active, which used to leave the tab bar pointing at the
 * wrong tab and made the back button retrace a full cross-tab journey.
 */
function HomeStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={DashboardScreen} />
      <Stack.Screen name="ReminderList" component={ReminderListScreen} />
      <Stack.Screen name="CreateReminder" component={CreateReminderScreen} />
      <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
    </Stack.Navigator>
  )
}

function FilesStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="Files" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Files" component={FilesScreen} />
      <Stack.Screen name="PropertyList" component={PropertyListScreen} />
      <Stack.Screen name="CreateProperty" component={CreatePropertyScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen name="ApplicantList" component={ApplicantListScreen} />
      <Stack.Screen name="CreateApplicant" component={CreateApplicantScreen} />
      <Stack.Screen name="ApplicantDetail" component={ApplicantDetailScreen} />
    </Stack.Navigator>
  )
}

function MatchingStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="Matching" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Matching" component={MatchingScreen} />
      <Stack.Screen name="DealList" component={DealListScreen} />
      <Stack.Screen name="DealDetail" component={DealDetailScreen} />
    </Stack.Navigator>
  )
}

function ContractsStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="ContractList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ContractList" component={ContractListScreen} />
      <Stack.Screen name="CreateContract" component={CreateContractScreen} />
      <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
    </Stack.Navigator>
  )
}

function ProfileStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="Settings" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  )
}

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
      <View style={[styles.pill, focused && styles.pillActive]}>
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
      borderRadius: theme.radius.full,
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
  const theme = useTheme()
  // §13.4 (safe area) — a literal `height` here would silently override
  // @react-navigation/bottom-tabs' own safe-area-aware sizing, which is
  // exactly what let tab labels render behind a phone's gesture-nav bar
  // (reported on Samsung A06). Add the bottom inset explicitly instead
  // of hardcoding a fixed height that assumes no gesture bar exists.
  const insets = useSafeAreaInsets()
  const tabBarHeight = theme.layout.bottomNavHeight + insets.bottom

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // §16 — all 5 tab stacks are registered from app start, not
        // lazily on first visit: `navigation.navigate('ScreenOwnedByAnotherTab')`
        // relies on React Navigation finding that screen already present
        // in a sibling tab's nested navigator state, which lazy mounting
        // would leave empty until that tab is first visited.
        lazy: false,
        // design-system.md §7.5 (v2.7.2) — the icon's own active-indicator
        // pill (makeTabIcon) now carries the active fill; the tab bar's
        // own background/ripple no longer does (see TabBarButton).
        tabBarButton: TabBarButton,
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: theme.spacing.space2,
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderTopColor: theme.colors.outlineVariant
        },
        tabBarLabelStyle: {
          ...theme.typography('labelSm'),
          fontSize: 10
        }
      }}
    >
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
