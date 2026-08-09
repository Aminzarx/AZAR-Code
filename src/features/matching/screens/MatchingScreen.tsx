import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator, SegmentedControl } from '@shared/components'
import { useProperties } from '@features/property/hooks/useProperties'
import { PropertyListItem } from '@features/property/components/PropertyListItem'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import { ApplicantListItem } from '@features/applicant/components/ApplicantListItem'

type Props = NativeStackScreenProps<MainStackParamList, 'Matching'>

type MatchingTarget = 'properties' | 'applicants'

const OPTIONS = [
  { value: 'properties' as const, label: 'املاک' },
  { value: 'applicants' as const, label: 'متقاضیان' }
]

/**
 * Matching tab root (design-system.md §7.5). Suggested-match browsing
 * itself already exists per-record (SuggestedApplicantsSection /
 * SuggestedPropertiesSection on the property/applicant detail screens) —
 * this is the entry point into that: pick a property or applicant here,
 * land on its detail screen where its matches are shown. Deliberately a
 * lighter list than the Files tab (no search, no create action) so the
 * two tabs read as distinct purposes rather than duplicates.
 */
export function MatchingScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const [target, setTarget] = useState<MatchingTarget>('properties')

  const propertiesResult = useProperties(userId, '')
  const applicantsResult = useApplicants(userId, '')
  const { isLoading, error, refetch } =
    target === 'properties' ? propertiesResult : applicantsResult

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={[theme.typography('titleMd'), styles.title]}>
          برای دیدن پیشنهادهای تطبیق، یک پرونده را انتخاب کنید
        </Text>
        <SegmentedControl options={OPTIONS} value={target} onChange={setTarget} />

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : target === 'properties' ? (
          (propertiesResult.properties?.length ?? 0) === 0 ? (
            <View style={styles.centeredSection}>
              <EmptyState
                title="هنوز پرونده‌ای ثبت نشده"
                description="با افزودن یک پرونده ملکی از تب املاک، پیشنهادهای تطبیق اینجا در دسترس می‌شود."
              />
            </View>
          ) : (
            <FlatList
              data={propertiesResult.properties ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <PropertyListItem
                  property={item}
                  onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
                />
              )}
            />
          )
        ) : (applicantsResult.applicants?.length ?? 0) === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز متقاضی‌ای ثبت نشده"
              description="با افزودن یک متقاضی از تب املاک، پیشنهادهای تطبیق اینجا در دسترس می‌شود."
            />
          </View>
        ) : (
          <FlatList
            data={applicantsResult.applicants ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ApplicantListItem
                applicant={item}
                onPress={() => navigation.navigate('ApplicantDetail', { applicantId: item.id })}
              />
            )}
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
    content: {
      flex: 1,
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    title: {
      color: theme.colors.onSurface
    },
    list: {
      gap: theme.spacing.space3
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
