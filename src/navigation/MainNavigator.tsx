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
    </Stack.Navigator>
  )
}
