import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { SegmentedControl } from '@shared/components'
import { PropertyListScreen } from '@features/property/screens/PropertyListScreen'
import { ApplicantListScreen } from '@features/applicant/screens/ApplicantListScreen'

type Props = NativeStackScreenProps<MainStackParamList, 'Files'>

type FileKind = 'properties' | 'applicants'

const OPTIONS = [
  { value: 'properties' as const, label: 'املاک' },
  { value: 'applicants' as const, label: 'متقاضیان' }
]

/**
 * Files tab root (design-system.md §7.5's bottom-nav item set). Owner
 * files vs. applicant files is a segmented-control choice, not two
 * separate tabs (§8.14's explicit "no Material Tabs, segmented controls
 * already cover every case" ruling) — this screen just switches which
 * existing list screen renders, reusing them as-is rather than
 * duplicating their search/list/create logic.
 */
export function FilesScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [kind, setKind] = useState<FileKind>('properties')

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.segmentWrapper}>
        <SegmentedControl options={OPTIONS} value={kind} onChange={setKind} />
      </View>
      <View style={styles.body}>
        {kind === 'properties' ? (
          <PropertyListScreen navigation={navigation as never} route={route as never} />
        ) : (
          <ApplicantListScreen navigation={navigation as never} route={route as never} />
        )}
      </View>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    segmentWrapper: {
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space4
    },
    body: {
      flex: 1
    }
  })
}
