import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { BasicProfileScreen } from '@features/auth/screens/BasicProfileScreen'
import { DashboardScreen } from '@features/dashboard/DashboardScreen'
import { PropertyListScreen } from '@features/property/screens/PropertyListScreen'
import { CreatePropertyScreen } from '@features/property/screens/CreatePropertyScreen'
import { PropertyDetailScreen } from '@features/property/screens/PropertyDetailScreen'
import { ApplicantListScreen } from '@features/applicant/screens/ApplicantListScreen'
import { CreateApplicantScreen } from '@features/applicant/screens/CreateApplicantScreen'
import { ApplicantDetailScreen } from '@features/applicant/screens/ApplicantDetailScreen'
import { DealListScreen } from '@features/deal/screens/DealListScreen'
import { DealDetailScreen } from '@features/deal/screens/DealDetailScreen'
import { ReminderListScreen } from '@features/reminder/screens/ReminderListScreen'
import { CreateReminderScreen } from '@features/reminder/screens/CreateReminderScreen'
import { ReminderDetailScreen } from '@features/reminder/screens/ReminderDetailScreen'
import { ContractListScreen } from '@features/contract/screens/ContractListScreen'
import { CreateContractScreen } from '@features/contract/screens/CreateContractScreen'
import { ContractDetailScreen } from '@features/contract/screens/ContractDetailScreen'

export type MainStackParamList = {
  BasicProfile: undefined
  Home: undefined
  PropertyList: undefined
  CreateProperty: undefined
  PropertyDetail: { propertyId: string }
  ApplicantList: undefined
  CreateApplicant: undefined
  ApplicantDetail: { applicantId: string }
  DealList: undefined
  DealDetail: { dealId: string }
  ReminderList: undefined
  CreateReminder: { propertyId?: string; applicantId?: string; dealId?: string } | undefined
  ReminderDetail: { reminderId: string }
  ContractList: undefined
  CreateContract: { propertyId: string; applicantId: string; dealId?: string }
  ContractDetail: { contractId: string }
}

const Stack = createNativeStackNavigator<MainStackParamList>()

/**
 * Rendered once a session exists (see RootNavigator). Starts at
 * BasicProfile so a freshly-registered user sees their new referral code
 * once before landing on the app itself.
 */
export function MainNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BasicProfile" component={BasicProfileScreen} />
      <Stack.Screen name="Home" component={DashboardScreen} />
      <Stack.Screen name="PropertyList" component={PropertyListScreen} />
      <Stack.Screen name="CreateProperty" component={CreatePropertyScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen name="ApplicantList" component={ApplicantListScreen} />
      <Stack.Screen name="CreateApplicant" component={CreateApplicantScreen} />
      <Stack.Screen name="ApplicantDetail" component={ApplicantDetailScreen} />
      <Stack.Screen name="DealList" component={DealListScreen} />
      <Stack.Screen name="DealDetail" component={DealDetailScreen} />
      <Stack.Screen name="ReminderList" component={ReminderListScreen} />
      <Stack.Screen name="CreateReminder" component={CreateReminderScreen} />
      <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
      <Stack.Screen name="ContractList" component={ContractListScreen} />
      <Stack.Screen name="CreateContract" component={CreateContractScreen} />
      <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
    </Stack.Navigator>
  )
}
