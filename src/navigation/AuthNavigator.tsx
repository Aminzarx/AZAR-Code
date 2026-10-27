import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { WelcomeScreen } from '@features/auth/screens/WelcomeScreen'
import { PhoneEntryScreen } from '@features/auth/screens/PhoneEntryScreen'
import { OtpVerificationScreen } from '@features/auth/screens/OtpVerificationScreen'
import { ReferralCodeScreen } from '@features/auth/screens/ReferralCodeScreen'
import { RegisterNameScreen } from '@features/auth/screens/RegisterNameScreen'
import { InviterPhoneScreen } from '@features/auth/screens/InviterPhoneScreen'

export type AuthStackParamList = {
  Welcome: undefined
  PhoneEntry: undefined
  OtpVerification: { phoneNumber: string }
  // Amin #5348/#5344: name first, then the invite code or the inviter's mobile
  RegisterName: { phoneNumber: string }
  ReferralCode: { phoneNumber: string; displayName?: string; agencyName?: string }
  InviterPhone: { phoneNumber: string; displayName?: string; agencyName?: string }
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
    // Amin #5186: a new page slides in from the left and slides back out to the left
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="RegisterName" component={RegisterNameScreen} />
      <Stack.Screen name="ReferralCode" component={ReferralCodeScreen} />
      <Stack.Screen name="InviterPhone" component={InviterPhoneScreen} />
    </Stack.Navigator>
  )
}
