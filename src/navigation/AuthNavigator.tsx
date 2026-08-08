import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { WelcomeScreen } from '@features/auth/screens/WelcomeScreen'
import { PhoneEntryScreen } from '@features/auth/screens/PhoneEntryScreen'
import { OtpVerificationScreen } from '@features/auth/screens/OtpVerificationScreen'
import { ReferralCodeScreen } from '@features/auth/screens/ReferralCodeScreen'
import { BasicProfileScreen } from '@features/auth/screens/BasicProfileScreen'

export type AuthStackParamList = {
  Welcome: undefined
  PhoneEntry: undefined
  OtpVerification: { phoneNumber: string }
  ReferralCode: { phoneNumber: string }
  BasicProfile: undefined
}

const Stack = createNativeStackNavigator<AuthStackParamList>()

/**
 * AUTH-01's registration flow (ui-screen-mapping.md's Authentication
 * section covers the Phone/OTP/Referral screens this maps to; Welcome and
 * BasicProfile are this phase's own additions — see phase-8 report).
 */
export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ReferralCode" component={ReferralCodeScreen} />
      <Stack.Screen name="BasicProfile" component={BasicProfileScreen} />
    </Stack.Navigator>
  )
}
