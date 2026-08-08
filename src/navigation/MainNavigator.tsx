import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { BasicProfileScreen } from '@features/auth/screens/BasicProfileScreen'
import { DashboardScreen } from '@features/dashboard/DashboardScreen'

export type MainStackParamList = {
  BasicProfile: undefined
  Home: undefined
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
    </Stack.Navigator>
  )
}
