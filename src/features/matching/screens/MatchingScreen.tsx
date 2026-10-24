import React, { useMemo, useState } from 'react'
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
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
  type MatchingCriterionState
} from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { moneyLine, shortTomanRange } from '@shared/utils/shortMoney'
import { useProperties } from '@features/property/hooks/useProperties'
import type { Property } from '@features/property/types'
import { useApplicants } from '@features/applicant/hooks/useApplicants'
import type { Applicant } from '@features/applicant/types'
import { useDealService } from '@features/deal/hooks/useDealService'
import { useApplicantMatchesForProperty } from '../hooks/useApplicantMatchesForProperty'
import { usePropertyMatchesForApplicant } from '../hooks/usePropertyMatchesForApplicant'
import {
  CRITERION_LABELS,
  findApplicantMatchesForProperty,
  findPropertyMatchesForApplicant
} from '../services/matchingService'
import type { MatchCriterion } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'Matching'>

type MatchingTarget = 'properties' | 'applicants'

// v1.4.0 (approved «تطبیق» design): what each applicant wants, with the
// files that fit it — or, the other way round, each file with its buyers.
const OPTIONS = [
  { value: 'applicants' as const, label: 'برای متقاضیان' },
  { value: 'properties' as const, label: 'برای فایل‌ها' }
]

/** how many matches each overview card previews */
const PREVIEW = 2

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

function propertyLine(property: Property): string {
  return [
    property.area !== null ? `${toPersianDigits(String(property.area))} متر` : null,
    moneyLine(property.price, property.depositAmount, property.rentAmount)
  ]
    .filter(Boolean)
    .join(' · ')
}

function applicantWants(applicant: Applicant): string {
  const what = [applicant.preferredTransactionType, applicant.preferredPropertyType]
    .filter(Boolean)
    .join(' ')
  const budget = shortTomanRange(applicant.minBudget, applicant.maxBudget)
  return [what, applicant.city, budget].filter(Boolean).join(' · ')
}

function propertyOffer(property: Property): string {
  return [property.transactionType, property.city, moneyLine(property.price, property.depositAmount, property.rentAmount)]
    .filter(Boolean)
    .join(' · ')
}

/** the text the applicant gets: the best fitting files, one per line */
function smsText(applicant: Applicant, properties: Property[]): string {
  const lines = properties.map((property) => {
    const detail = propertyLine(property)
    return `• ${property.title}${detail ? ` (${detail})` : ''}`
  })
  return [`سلام ${applicant.fullName}،`, 'چند فایل مناسب خواستهٔ شما:', ...lines].join('\n')
}

/**
 * Matching Workspace (design-system.md §17.1) — pick ملک or متقاضی, pick a
 * specific record, then see its real matches via the shared
 * `MatchingResult` component. Property/Applicant Detail keep their own
 * compact suggestion sections (SuggestedPropertiesSection /
 * SuggestedApplicantsSection); this screen is the full workspace those
 * sections' "مشاهده همه" would lead to.
 */
export function MatchingScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { propertyId: preselectedPropertyId, applicantId: preselectedApplicantId } =
    route.params ?? {}
  // A "مشاهده همه" link from Property/Applicant Detail arrives here with
  // one of these params — preselect the matching target/record instead of
  // dropping the user at the bare picker they'd otherwise have to redo.
  const [target, setTarget] = useState<MatchingTarget>(
    preselectedPropertyId ? 'properties' : 'applicants'
  )
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    preselectedPropertyId ?? null
  )
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    preselectedApplicantId ?? null
  )
  const [creatingKey, setCreatingKey] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const dealService = useDealService()

  const propertiesResult = useProperties(userId, '')
  const applicantsResult = useApplicants(userId, '')

  // the overview: every applicant with the files that fit (or every file
  // with its applicants), best first — both lists are already loaded
  const overview = useMemo(() => {
    const properties = (propertiesResult.properties ?? []).filter((p) => p.status !== 'archived')
    const applicants = applicantsResult.applicants ?? []
    if (target === 'applicants') {
      return applicants
        .map((applicant) => ({
          id: applicant.id,
          applicant,
          propertyMatches: findPropertyMatchesForApplicant(applicant, properties)
        }))
        .sort((x, y) => y.propertyMatches.length - x.propertyMatches.length)
    }
    return properties
      .map((property) => ({
        id: property.id,
        property,
        applicantMatches: findApplicantMatchesForProperty(property, applicants)
      }))
      .sort((x, y) => y.applicantMatches.length - x.applicantMatches.length)
  }, [target, propertiesResult.properties, applicantsResult.applicants])

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {!hasSelection ? (
          <View style={styles.heading}>
            <Text style={[theme.typography('headlineMd'), styles.title]}>تطبیق</Text>
            <Text style={[theme.typography('bodySm'), styles.lead]}>
              {target === 'applicants'
                ? 'فایل‌هایی که با خواستهٔ هر متقاضی جور است.'
                : 'متقاضیانی که هر فایل به کارشان می‌آید.'}
            </Text>
          </View>
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
              data={overview as { id: string; property: Property; applicantMatches: ReturnType<typeof findApplicantMatchesForProperty> }[]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const top = item.applicantMatches[0]
                return (
                  <OverviewCard
                    title={item.property.title}
                    subtitle={propertyOffer(item.property)}
                    count={item.applicantMatches.length}
                    emptyText="هنوز متقاضی مناسبی نیست"
                    onOpen={() => setSelectedPropertyId(item.property.id)}
                    rows={item.applicantMatches.slice(0, PREVIEW).map((match) => ({
                      key: match.applicant.id,
                      score: match.score,
                      title: match.applicant.fullName,
                      detail: applicantWants(match.applicant),
                      onPress: () => navigateAcrossTabs(navigation, 'ApplicantDetail', { applicantId: match.applicant.id })
                    }))}
                    secondaryLabel={top ? 'تماس با متقاضی' : undefined}
                    onSecondary={top ? () => Linking.openURL(`tel:${top.applicant.phoneNumber}`).catch(() => undefined) : undefined}
                    primaryLabel={
                      top ? (creatingKey === `${item.property.id}:${top.applicant.id}` ? 'در حال ایجاد…' : 'شروع معامله') : undefined
                    }
                    onPrimary={top ? () => handleCreateDeal(item.property.id, top.applicant.id) : undefined}
                  />
                )
              }}
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
            data={overview as { id: string; applicant: Applicant; propertyMatches: ReturnType<typeof findPropertyMatchesForApplicant> }[]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const top = item.propertyMatches[0]
              const preview = item.propertyMatches.slice(0, PREVIEW)
              return (
                <OverviewCard
                  title={item.applicant.fullName}
                  subtitle={applicantWants(item.applicant)}
                  count={item.propertyMatches.length}
                  emptyText="هنوز فایل مناسبی نیست"
                  onOpen={() => setSelectedApplicantId(item.applicant.id)}
                  rows={preview.map((match) => ({
                    key: match.property.id,
                    score: match.score,
                    title: match.property.title,
                    detail: propertyLine(match.property),
                    onPress: () => navigateAcrossTabs(navigation, 'PropertyDetail', { propertyId: match.property.id })
                  }))}
                  secondaryLabel={top ? 'ارسال برای متقاضی' : undefined}
                  onSecondary={
                    top
                      ? () =>
                          Linking.openURL(
                            `sms:${item.applicant.phoneNumber}?body=${encodeURIComponent(
                              smsText(item.applicant, preview.map((match) => match.property))
                            )}`
                          ).catch(() => undefined)
                      : undefined
                  }
                  primaryLabel={
                    top ? (creatingKey === `${top.property.id}:${item.applicant.id}` ? 'در حال ایجاد…' : 'شروع معامله') : undefined
                  }
                  onPrimary={top ? () => handleCreateDeal(top.property.id, item.applicant.id) : undefined}
                />
              )
            }}
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

type OverviewRow = { key: string; score: number; title: string; detail: string; onPress: () => void }

type OverviewCardProps = {
  title: string
  subtitle: string
  count: number
  emptyText: string
  onOpen: () => void
  rows: OverviewRow[]
  secondaryLabel?: string
  onSecondary?: () => void
  primaryLabel?: string
  onPrimary?: () => void
}

/** v1.4.0: one applicant (or file) with its best matches and the two next steps. */
function OverviewCard({
  title,
  subtitle,
  count,
  emptyText,
  onOpen,
  rows,
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onPrimary
}: OverviewCardProps): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onOpen} style={styles.cardHead}>
        <View style={styles.cardTitleRow}>
          <Text style={[theme.typography('titleSm'), styles.cardTitle]} numberOfLines={1}>
            {title}
          </Text>
          {count > 0 ? (
            <View style={styles.countPill}>
              <Text style={[theme.typography('labelSm'), styles.countText]}>{`${toPersianDigits(String(count))} مورد`}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[theme.typography('bodySm'), styles.muted]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
      {rows.length === 0 ? (
        <Text style={[theme.typography('bodySm'), styles.muted]}>{emptyText}</Text>
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={row.title}
            onPress={row.onPress}
            style={({ pressed }) => [styles.matchRow, pressed && styles.matchRowPressed]}
          >
            <View style={styles.matchText}>
              <Text style={[theme.typography('labelMd'), styles.matchTitle]} numberOfLines={1}>
                {row.title}
              </Text>
              {row.detail ? (
                <Text style={[theme.typography('labelSm'), styles.muted]} numberOfLines={1}>
                  {row.detail}
                </Text>
              ) : null}
            </View>
            <View style={styles.scoreBadge}>
              <Text style={[theme.typography('labelSm'), styles.scoreText]}>{`${toPersianDigits(String(row.score))}٪`}</Text>
            </View>
          </Pressable>
        ))
      )}
      {primaryLabel && onPrimary ? (
        <View style={styles.actions}>
          {secondaryLabel && onSecondary ? (
            <Pressable accessibilityRole="button" accessibilityLabel={secondaryLabel} onPress={onSecondary} style={[styles.actionButton, styles.actionSecondary]}>
              <Text style={[theme.typography('labelMd'), styles.actionSecondaryText]}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={onPrimary} style={[styles.actionButton, styles.actionPrimary]}>
            <Text style={[theme.typography('labelMd'), styles.actionPrimaryText]}>{primaryLabel}</Text>
          </Pressable>
        </View>
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
      gap: theme.spacing.space3,
      paddingBottom: theme.spacing.space6
    },
    heading: { gap: theme.spacing.space1 },
    lead: { color: theme.colors.onSurfaceVariant, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space2
    },
    cardHead: { gap: theme.spacing.space1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.space2 },
    cardTitle: { color: theme.colors.onSurface, flexShrink: 1 },
    countPill: {
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.successContainer
    },
    countText: { color: theme.colors.onSuccessContainer },
    muted: { color: theme.colors.onSurfaceVariant, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    matchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space3,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.surfaceContainerLow
    },
    matchRowPressed: { backgroundColor: theme.colors.surfaceContainer },
    matchText: { flex: 1, gap: 2 },
    matchTitle: { color: theme.colors.onSurface, alignSelf: theme.isRTL ? 'flex-start' : 'flex-end' },
    scoreBadge: {
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: 2,
      borderRadius: theme.radius.small,
      backgroundColor: theme.colors.successContainer
    },
    scoreText: { color: theme.colors.onSuccessContainer, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: theme.spacing.space2, marginTop: theme.spacing.space1 },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: theme.radius.medium
    },
    actionPrimary: { backgroundColor: theme.colors.primary },
    actionPrimaryText: { color: theme.colors.onPrimary, fontWeight: '700' },
    actionSecondary: { backgroundColor: theme.colors.surfaceContainer },
    actionSecondaryText: { color: theme.colors.onSurface, fontWeight: '700' },
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
