import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import { withTheme } from '@shared/components/testHelpers'
import { MainNavigator } from '../MainNavigator'

// MainNavigator's own concern is the 5-tab wiring — each tab root screen
// has its own full test suite already (data loading, errors, etc.), so
// those are stubbed here to keep this test about navigation structure,
// not re-testing every screen's internals.
jest.mock('@features/dashboard/DashboardScreen', () => ({
  DashboardScreen: ({
    navigation
  }: {
    navigation: import('@react-navigation/native').NavigationProp<object>
  }) => {
    const { Text: RNText, Pressable } = require('react-native')
    const { navigateAcrossTabs } = require('../crossTabNavigate')
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="برو به جزئیات پرونده"
        onPress={() => navigateAcrossTabs(navigation, 'PropertyDetail', { propertyId: 'p1' })}
      >
        <RNText>صفحه خانه</RNText>
      </Pressable>
    )
  }
}))
jest.mock('@features/property/screens/PropertyDetailScreen', () => ({
  PropertyDetailScreen: () => {
    const { Text: RNText } = require('react-native')
    return <RNText>صفحه جزئیات پرونده</RNText>
  }
}))
jest.mock('@features/files/screens/FilesScreen', () => ({
  FilesScreen: () => {
    const { Text: RNText } = require('react-native')
    return <RNText>صفحه پرونده‌ها</RNText>
  }
}))
jest.mock('@features/matching/screens/MatchingScreen', () => ({
  MatchingScreen: () => {
    const { Text: RNText } = require('react-native')
    return <RNText>صفحه تطبیق</RNText>
  }
}))
jest.mock('@features/contract/screens/ContractListScreen', () => ({
  ContractListScreen: () => {
    const { Text: RNText } = require('react-native')
    return <RNText>صفحه قراردادها</RNText>
  }
}))
jest.mock('@features/settings/screens/SettingsScreen', () => ({
  SettingsScreen: () => {
    const { Text: RNText } = require('react-native')
    return <RNText>صفحه پروفایل</RNText>
  }
}))

function renderMainNavigator() {
  return render(
    withTheme(
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    )
  )
}

describe('MainNavigator', () => {
  it('starts on the Home tab', async () => {
    const { findByText } = await renderMainNavigator()
    expect(await findByText('صفحه خانه')).toBeTruthy()
  })

  it('renders all 5 bottom tab labels', async () => {
    const { findByText } = await renderMainNavigator()
    expect(await findByText('خانه')).toBeTruthy()
    expect(await findByText('پرونده‌ها')).toBeTruthy()
    expect(await findByText('تطبیق')).toBeTruthy()
    expect(await findByText('قراردادها')).toBeTruthy()
    expect(await findByText('پروفایل')).toBeTruthy()
  })

  it('switches to the Files tab root when pressed', async () => {
    const { findByText } = await renderMainNavigator()
    fireEvent.press(await findByText('پرونده‌ها'))
    expect(await findByText('صفحه پرونده‌ها')).toBeTruthy()
  })

  it('switches to the Profile tab root (Settings) when pressed', async () => {
    const { findByText } = await renderMainNavigator()
    fireEvent.press(await findByText('پروفایل'))
    expect(await findByText('صفحه پروفایل')).toBeTruthy()
  })

  it('navigating from Home to a Files-owned screen switches to the Files tab, not a push within Home', async () => {
    const { findByLabelText, findByText, queryByText } = await renderMainNavigator()
    fireEvent.press(await findByLabelText('برو به جزئیات پرونده'))

    expect(await findByText('صفحه جزئیات پرونده')).toBeTruthy()
    // The Home tab's own root screen is no longer mounted on top of a
    // pushed PropertyDetail — the whole HomeTab stack was left behind in
    // favor of switching to FilesTab, which is what makes the back
    // button land on Files (not retrace through Home) afterward.
    expect(queryByText('صفحه خانه')).toBeNull()
  })
})
