import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { WelcomeScreen } from '@features/auth/screens/WelcomeScreen'
import { PhoneEntryScreen } from '@features/auth/screens/PhoneEntryScreen'
import { OtpVerificationScreen } from '@features/auth/screens/OtpVerificationScreen'
import { ReferralCodeScreen } from '@features/auth/screens/ReferralCodeScreen'

export type AuthStackParamList = {
  Welcome: undefined
  PhoneEntry: undefined
  OtpVerification: { phoneNumber: string }
  ReferralCode: { phoneNumber: string }
}

const Stack = createNativeStackNavigator<AuthStackParamList>()

/**
 * AUTH-01's registration flow (ui-screen-mapping.md's Authentication
 * section covers the Phone/OTP/Referral screens this maps to; Welcome is
 * this phase's own addition — see phase-8 report). ReferralCodeScreen's
 * register() call sets the session directly, which RootNavigator reacts
 * to by swapping to MainNavigator — there is no screen after this one to
 * navigate to (BasicProfile, which used to show the new referral code
 * here, was removed: that code now lives in Settings, not forced on the
 * user immediately after registering).
 */
export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ReferralCode" component={ReferralCodeScreen} />
    </Stack.Navigator>
  )
}
