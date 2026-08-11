import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import {
  Button,
  ContextHeader,
  EmptyState,
  ErrorState,
  LoadingIndicator,
  MatchingResult,
  SegmentedControl,
  SelectionListItem,
  type MatchingCriterionState
} from '@shared/components'
import { useProperties } from '@features/property/hooks/useProperties'
import type { Property } from '@features/property/types'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import type { Applicant } from '@features/applicant/types'
import { useDealService } from '@features/deal/hooks/useDealService'
import { useApplicantMatchesForProperty } from '../hooks/useApplicantMatchesForProperty'
import { usePropertyMatchesForApplicant } from '../hooks/usePropertyMatchesForApplicant'
import { CRITERION_LABELS } from '../services/matchingService'
import type { MatchCriterion } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'Matching'>

type MatchingTarget = 'properties' | 'applicants'

const OPTIONS = [
  { value: 'properties' as const, label: 'املاک' },
  { value: 'applicants' as const, label: 'متقاضیان' }
]

/** Fixed order matches CRITERION_LABELS' own declaration — every match result shows all criteria, matched or not. */
const ALL_CRITERIA: MatchCriterion[] = [
  'city',
  'propertyType',
  'transactionType',
  'budget',
  'area',
  'rooms'
]

function buildCriteria(matchedCriteria: MatchCriterion[]): MatchingCriterionState[] {
  return ALL_CRITERIA.map((criterion) => ({
    key: criterion,
    label: CRITERION_LABELS[criterion],
    matched: matchedCriteria.includes(criterion)
  }))
}

/** Just enough context to pick the right record — full detail lives one tap away on its own Detail screen. */
function propertyPickerSubtitle(property: Property): string {
  const price = property.price ? `${property.price.toLocaleString('fa-IR')} تومان` : null
  return [property.city, price].filter(Boolean).join(' • ')
}

function applicantPickerSubtitle(applicant: Applicant): string {
  const budget = applicant.maxBudget
    ? `تا ${applicant.maxBudget.toLocaleString('fa-IR')} تومان`
    : applicant.minBudget
      ? `از ${applicant.minBudget.toLocaleString('fa-IR')} تومان`
      : null
  return [applicant.city, budget].filter(Boolean).join(' • ')
}

/**
 * Matching Workspace (design-system.md §17.1) — pick ملک or متقاضی, pick a
 * specific record, then see its real matches via the shared
 * `MatchingResult` component. Property/Applicant Detail keep their own
 * compact suggestion sections (SuggestedPropertiesSection /
 * SuggestedApplicantsSection); this screen is the full workspace those
 * sections' "مشاهده همه" would lead to.
 */
export function MatchingScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const [target, setTarget] = useState<MatchingTarget>('properties')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const dealService = useDealService()

  const propertiesResult = useProperties(userId, '')
  const applicantsResult = useApplicants(userId, '')

  const selectedProperty: Property | null =
    propertiesResult.properties?.find((property) => property.id === selectedPropertyId) ?? null
  const selectedApplicant: Applicant | null =
    applicantsResult.applicants?.find((applicant) => applicant.id === selectedApplicantId) ?? null

  const applicantMatchesResult = useApplicantMatchesForProperty(
    target === 'properties' ? selectedProperty : null
  )
  const propertyMatchesResult = usePropertyMatchesForApplicant(
    target === 'applicants' ? selectedApplicant : null
  )

  function handleTargetChange(nextTarget: MatchingTarget): void {
    setTarget(nextTarget)
    setSelectedPropertyId(null)
    setSelectedApplicantId(null)
    setCreateError(null)
  }

  function clearSelection(): void {
    setSelectedPropertyId(null)
    setSelectedApplicantId(null)
    setCreateError(null)
  }

  async function handleCreateDeal(propertyId: string, applicantId: string): Promise<void> {
    if (!dealService) {
      return
    }
    const key = `${propertyId}:${applicantId}`
    setCreateError(null)
    setCreatingKey(key)
    try {
      const deal = await dealService.createDeal(userId, propertyId, applicantId)
      // Navigating away makes clearing creatingKey moot (and risks a
      // post-unmount state update on a fast test double), so only the
      // failure path resets it.
      navigation.navigate('DealDetail', { dealId: deal.id })
    } catch {
      setCreateError('ایجاد معامله با مشکل مواجه شد. دوباره تلاش کنید.')
      setCreatingKey(null)
    }
  }

  const { isLoading, error, refetch } =
    target === 'properties' ? propertiesResult : applicantsResult
  const hasSelection =
    target === 'properties' ? selectedProperty !== null : selectedApplicant !== null

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {!hasSelection ? (
          <Text style={[theme.typography('titleMd'), styles.title]}>
            برای دیدن پیشنهادهای تطبیق، یک فایل را انتخاب کنید
          </Text>
        ) : null}
        <SegmentedControl options={OPTIONS} value={target} onChange={handleTargetChange} />

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
          selectedProperty ? (
            <PropertyMatches
              property={selectedProperty}
              matchesResult={applicantMatchesResult}
              creatingKey={creatingKey}
              createError={createError}
              onChangeSelection={clearSelection}
              onCreateDeal={handleCreateDeal}
              onViewApplicant={(applicantId) =>
                navigateAcrossTabs(navigation, 'ApplicantDetail', { applicantId })
              }
            />
          ) : (propertiesResult.properties?.length ?? 0) === 0 ? (
            <View style={styles.centeredSection}>
              <EmptyState
                title="هنوز فایلی ثبت نشده"
                description="با افزودن یک فایل ملکی از تب املاک، پیشنهادهای تطبیق اینجا در دسترس می‌شود."
                actionLabel="افزودن فایل ملکی"
                onAction={() => navigateAcrossTabs(navigation, 'CreateProperty', undefined)}
              />
            </View>
          ) : (
            <FlatList
              data={propertiesResult.properties ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <SelectionListItem
                  icon="files"
                  tone="secondary"
                  title={item.title}
                  subtitle={propertyPickerSubtitle(item)}
                  onPress={() => setSelectedPropertyId(item.id)}
                />
              )}
            />
          )
        ) : selectedApplicant ? (
          <ApplicantMatches
            applicant={selectedApplicant}
            matchesResult={propertyMatchesResult}
            creatingKey={creatingKey}
            createError={createError}
            onChangeSelection={clearSelection}
            onCreateDeal={handleCreateDeal}
            onViewProperty={(propertyId) =>
              navigateAcrossTabs(navigation, 'PropertyDetail', { propertyId })
            }
          />
        ) : (applicantsResult.applicants?.length ?? 0) === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز متقاضی‌ای ثبت نشده"
              description="با افزودن یک متقاضی از تب املاک، پیشنهادهای تطبیق اینجا در دسترس می‌شود."
              actionLabel="افزودن متقاضی"
              onAction={() => navigateAcrossTabs(navigation, 'CreateApplicant', undefined)}
            />
          </View>
        ) : (
          <FlatList
            data={applicantsResult.applicants ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <SelectionListItem
                icon="person"
                tone="tertiary"
                title={item.fullName}
                subtitle={applicantPickerSubtitle(item)}
                onPress={() => setSelectedApplicantId(item.id)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

type PropertyMatchesProps = {
  property: Property
  matchesResult: ReturnType<typeof useApplicantMatchesForProperty>
  creatingKey: string | null
  createError: string | null
  onChangeSelection: () => void
  onCreateDeal: (propertyId: string, applicantId: string) => void
  onViewApplicant: (applicantId: string) => void
}

/** Applicant matches shown for a chosen property — same shape as ApplicantMatches below, kept separate for clear prop naming. */
function PropertyMatches({
  property,
  matchesResult,
  creatingKey,
  createError,
  onChangeSelection,
  onCreateDeal,
  onViewApplicant
}: PropertyMatchesProps): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { matches, isLoading, error, refetch } = matchesResult

  return (
    <View style={styles.resultsSection}>
      <SelectionHeader primary={property.title} onChangeSelection={onChangeSelection} />

      {isLoading ? (
        <View style={styles.centeredSection}>
          <LoadingIndicator size="large" />
        </View>
      ) : error ? (
        <ErrorState
          title="محاسبه پیشنهادها با مشکل مواجه شد"
          description={error.message}
          retryLabel="تلاش مجدد"
          onRetry={refetch}
        />
      ) : matches && matches.length === 0 ? (
        <EmptyState
          title="فعلاً پیشنهادی وجود ندارد"
          description="متقاضی‌ای که با ویژگی‌های این ملک هم‌خوانی داشته باشد پیدا نشد."
        />
      ) : (
        <FlatList
          data={matches ?? []}
          keyExtractor={(match) => match.applicant.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: match }) => {
            const key = `${property.id}:${match.applicant.id}`
            return (
              <MatchingResult
                title={match.applicant.fullName}
                subtitle={`${match.applicant.city} • ${match.applicant.phoneNumber}`}
                criteria={buildCriteria(match.matchedCriteria)}
                onPress={() => onViewApplicant(match.applicant.id)}
                primaryActionLabel={creatingKey === key ? 'در حال ایجاد…' : 'ایجاد معامله'}
                onPrimaryAction={() => onCreateDeal(property.id, match.applicant.id)}
              />
            )
          }}
        />
      )}
      {createError ? (
        <Text style={[theme.typography('bodySm'), styles.error]}>{createError}</Text>
      ) : null}
    </View>
  )
}

type ApplicantMatchesProps = {
  applicant: Applicant
  matchesResult: ReturnType<typeof usePropertyMatchesForApplicant>
  creatingKey: string | null
  createError: string | null
  onChangeSelection: () => void
  onCreateDeal: (propertyId: string, applicantId: string) => void
  onViewProperty: (propertyId: string) => void
}

/** Property matches shown for a chosen applicant. */
function ApplicantMatches({
  applicant,
  matchesResult,
  creatingKey,
  createError,
  onChangeSelection,
  onCreateDeal,
  onViewProperty
}: ApplicantMatchesProps): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { matches, isLoading, error, refetch } = matchesResult

  return (
    <View style={styles.resultsSection}>
      <SelectionHeader primary={applicant.fullName} onChangeSelection={onChangeSelection} />

      {isLoading ? (
        <View style={styles.centeredSection}>
          <LoadingIndicator size="large" />
        </View>
      ) : error ? (
        <ErrorState
          title="محاسبه پیشنهادها با مشکل مواجه شد"
          description={error.message}
          retryLabel="تلاش مجدد"
          onRetry={refetch}
        />
      ) : matches && matches.length === 0 ? (
        <EmptyState
          title="فعلاً پیشنهادی وجود ندارد"
          description="ملکی که با ترجیحات این متقاضی هم‌خوانی داشته باشد پیدا نشد."
        />
      ) : (
        <FlatList
          data={matches ?? []}
          keyExtractor={(match) => match.property.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: match }) => {
            const key = `${match.property.id}:${applicant.id}`
            return (
              <MatchingResult
                title={match.property.title}
                subtitle={`${match.property.city} • ${match.property.address}`}
                criteria={buildCriteria(match.matchedCriteria)}
                onPress={() => onViewProperty(match.property.id)}
                primaryActionLabel={creatingKey === key ? 'در حال ایجاد…' : 'ایجاد معامله'}
                onPrimaryAction={() => onCreateDeal(match.property.id, applicant.id)}
              />
            )
          }}
        />
      )}
      {createError ? (
        <Text style={[theme.typography('bodySm'), styles.error]}>{createError}</Text>
      ) : null}
    </View>
  )
}

type SelectionHeaderProps = {
  primary: string
  onChangeSelection: () => void
}

function SelectionHeader({ primary, onChangeSelection }: SelectionHeaderProps): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.selectionHeaderRow}>
      <ContextHeader primary={primary} />
      <Button label="تغییر انتخاب" variant="text" fullWidth={false} onPress={onChangeSelection} />
    </View>
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
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    list: {
      gap: theme.spacing.space3
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    resultsSection: {
      flex: 1,
      gap: theme.spacing.space3
    },
    selectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space3
    },
    error: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    }
  })
}
