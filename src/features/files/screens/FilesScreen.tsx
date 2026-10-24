import React, { useEffect, useState } from 'react'
import { OfflineFilesNotice } from '@features/auth/components/OfflineFilesNotice'
import { useFilesVersion } from '@shared/hooks/useFilesVersion'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useTheme, type Theme } from '@shared/theme'
import { SegmentedControl } from '@shared/components'
import { PropertyListScreen } from '@features/property/screens/PropertyListScreen'
import { ApplicantListScreen } from '@features/applicant/screens/ApplicantListScreen'

type Props = NativeStackScreenProps<MainStackParamList, 'Files'>

type FileKind = 'properties' | 'applicants'

/**
 * Files tab root (design-system.md §7.5's bottom-nav item set). Owner
 * files vs. applicant files is a segmented-control choice (§7.4), not
 * two separate tabs — this screen just switches which existing list
 * screen renders, reusing them as-is rather than duplicating their
 * search/list/create logic. v1.3.0 (design batch 2): a «فایل‌ها» title.
 * v1.5.0 (Amin #4817): the segments carry no file counts.
 */
export function FilesScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [kind, setKind] = useState<FileKind>('properties')

  // v1.3.0: tabs stay mounted (lazy: false), so the lists never
  // reloaded after a file was saved on the create screen — the list kept
  // showing «هنوز فایلی ثبت نشده». Reload on every return to this tab.
  const [refreshKey, setRefreshKey] = useState(0)
  // option A (Amin #4826): and when the account's files arrive from the server while the list is open
  const filesVersion = useFilesVersion()
  useEffect(() => {
    if (typeof navigation.addListener !== 'function') {
      return undefined
    }
    return navigation.addListener('focus', () => setRefreshKey((current) => current + 1))
  }, [navigation])

  const options = [
    { value: 'properties' as const, label: 'املاک' },
    { value: 'applicants' as const, label: 'متقاضیان' }
  ]

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.top}>
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>فایل‌ها</Text>
        <SegmentedControl options={options} value={kind} onChange={setKind} />
        <OfflineFilesNotice />
      </View>
      <View style={styles.body}>
        {kind === 'properties' ? (
          <PropertyListScreen
            navigation={navigation as never}
            route={route as never}
            embedded
            refreshKey={refreshKey + filesVersion}
          />
        ) : (
          <ApplicantListScreen
            navigation={navigation as never}
            route={route as never}
            embedded
            refreshKey={refreshKey + filesVersion}
          />
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
    top: {
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space4,
      gap: theme.spacing.space4
    },
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    body: {
      flex: 1
    }
  })
}
