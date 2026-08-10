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
import { useTheme } from '@shared/theme'
import { Icon, type IconName } from '@shared/components'

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
  Matching: undefined
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
  FilesTab: 'پرونده‌ها',
  MatchingTab: 'تطبیق',
  ContractsTab: 'قراردادها',
  ProfileTab: 'پروفایل'
}

const TAB_ICONS: Record<TabName, IconName> = {
  HomeTab: 'home',
  FilesTab: 'files',
  MatchingTab: 'matching',
  ContractsTab: 'contract',
  ProfileTab: 'settings'
}

const TAB_INITIAL_ROUTE: Record<TabName, keyof MainStackParamList> = {
  HomeTab: 'Home',
  FilesTab: 'Files',
  MatchingTab: 'Matching',
  ContractsTab: 'ContractList',
  ProfileTab: 'Settings'
}

/**
 * One shared screen set, mounted once per tab with a different
 * initialRouteName — every navigation.navigate('X') call anywhere in the
 * app keeps working unchanged regardless of which tab it's called from,
 * since 'X' is registered identically in all five. Each tab still keeps
 * its own independent push history, which is the whole point of a
 * bottom-tab layout (standard React Navigation nested-stack-per-tab
 * pattern).
 */
function MainStack({
  initialRouteName
}: {
  initialRouteName: keyof MainStackParamList
}): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={DashboardScreen} />
      <Stack.Screen name="Files" component={FilesScreen} />
      <Stack.Screen name="PropertyList" component={PropertyListScreen} />
      <Stack.Screen name="CreateProperty" component={CreatePropertyScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen name="ApplicantList" component={ApplicantListScreen} />
      <Stack.Screen name="CreateApplicant" component={CreateApplicantScreen} />
      <Stack.Screen name="ApplicantDetail" component={ApplicantDetailScreen} />
      <Stack.Screen name="Matching" component={MatchingScreen} />
      <Stack.Screen name="DealList" component={DealListScreen} />
      <Stack.Screen name="DealDetail" component={DealDetailScreen} />
      <Stack.Screen name="ReminderList" component={ReminderListScreen} />
      <Stack.Screen name="CreateReminder" component={CreateReminderScreen} />
      <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
      <Stack.Screen name="ContractList" component={ContractListScreen} />
      <Stack.Screen name="CreateContract" component={CreateContractScreen} />
      <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  )
}

function makeTabIcon(name: IconName) {
  return ({ color }: { color: string }) => <Icon name={name} size="md" color={color} />
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
        tabBarActiveTintColor: theme.colors.onSecondaryContainer,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
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
        children={() => <MainStack initialRouteName={TAB_INITIAL_ROUTE.HomeTab} />}
      />
      <Tab.Screen
        name="FilesTab"
        options={{ tabBarLabel: TAB_LABELS.FilesTab, tabBarIcon: makeTabIcon(TAB_ICONS.FilesTab) }}
        children={() => <MainStack initialRouteName={TAB_INITIAL_ROUTE.FilesTab} />}
      />
      <Tab.Screen
        name="MatchingTab"
        options={{
          tabBarLabel: TAB_LABELS.MatchingTab,
          tabBarIcon: makeTabIcon(TAB_ICONS.MatchingTab)
        }}
        children={() => <MainStack initialRouteName={TAB_INITIAL_ROUTE.MatchingTab} />}
      />
      <Tab.Screen
        name="ContractsTab"
        options={{
          tabBarLabel: TAB_LABELS.ContractsTab,
          tabBarIcon: makeTabIcon(TAB_ICONS.ContractsTab)
        }}
        children={() => <MainStack initialRouteName={TAB_INITIAL_ROUTE.ContractsTab} />}
      />
      <Tab.Screen
        name="ProfileTab"
        options={{
          tabBarLabel: TAB_LABELS.ProfileTab,
          tabBarIcon: makeTabIcon(TAB_ICONS.ProfileTab)
        }}
        children={() => <MainStack initialRouteName={TAB_INITIAL_ROUTE.ProfileTab} />}
      />
    </Tab.Navigator>
  )
}
