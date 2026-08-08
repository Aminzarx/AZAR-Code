import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { PlaceholderScreen } from '@features/placeholder/PlaceholderScreen'

export type RootStackParamList = {
  Placeholder: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

/**
 * Phase 5 navigation shell — a single placeholder route. Real route trees
 * (auth, dashboard, files, matching, contracts, settings, restore) are
 * added from Phase 12 onward per docs/implementation/ui-screen-mapping.md.
 */
export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
