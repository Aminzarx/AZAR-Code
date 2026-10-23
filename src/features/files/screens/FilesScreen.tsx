import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { SegmentedControl } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { useProperties } from '@features/property/hooks/useProperties'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { PropertyListScreen } from '@features/property/screens/PropertyListScreen'
import { ApplicantListScreen } from '@features/applicant/screens/ApplicantListScreen'

type Props = NativeStackScreenProps<MainStackParamList, 'Files'>

type FileKind = 'properties' | 'applicants'

function withCount(label: string, count: number | undefined): string {
  return count === undefined ? label : `${label} ${toPersianDigits(String(count))}`
}

/**
 * Files tab root (design-system.md §7.5's bottom-nav item set). Owner
 * files vs. applicant files is a segmented-control choice (§7.4), not
 * two separate tabs — this screen just switches which existing list
 * screen renders, reusing them as-is rather than duplicating their
 * search/list/create logic. v1.3.0 (design batch 2): a «فایل‌ها» title
 * and the number of files on each segment («املاک ۲۴»، «متقاضیان ۱۸»).
 */
export function FilesScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [kind, setKind] = useState<FileKind>('properties')
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { properties, refetch: refetchProperties } = useProperties(userId, '')
  const { applicants, refetch: refetchApplicants } = useApplicants(userId, '')

  // v1.3.0: tabs stay mounted (lazy: false), so the lists and counts never
  // reloaded after a file was saved on the create screen — the list kept
  // showing «هنوز فایلی ثبت نشده». Reload on every return to this tab.
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    if (typeof navigation.addListener !== 'function') {
      return undefined
    }
    return navigation.addListener('focus', () => setRefreshKey((current) => current + 1))
  }, [navigation])
  useEffect(() => {
    if (refreshKey) {
      refetchProperties()
      refetchApplicants()
    }
  }, [refreshKey, refetchProperties, refetchApplicants])

  const options = [
    { value: 'properties' as const, label: withCount('املاک', properties?.length) },
    { value: 'applicants' as const, label: withCount('متقاضیان', applicants?.length) }
  ]

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.top}>
        <Text style={[theme.typography('headlineLgMobile'), styles.title]}>فایل‌ها</Text>
        <SegmentedControl options={options} value={kind} onChange={setKind} />
      </View>
      <View style={styles.body}>
        {kind === 'properties' ? (
          <PropertyListScreen
            navigation={navigation as never}
            route={route as never}
            embedded
            refreshKey={refreshKey}
          />
        ) : (
          <ApplicantListScreen
            navigation={navigation as never}
            route={route as never}
            embedded
            refreshKey={refreshKey}
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
