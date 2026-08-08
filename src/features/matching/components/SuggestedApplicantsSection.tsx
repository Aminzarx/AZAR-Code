import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import type { Property } from '@features/property/types'
import { useApplicantMatchesForProperty } from '../hooks/useApplicantMatchesForProperty'
import { MatchScoreBadge } from './MatchScoreBadge'
import { CreateDealButton } from './CreateDealButton'
import { CRITERION_LABELS } from '../services/matchingService'

type Props = {
  property: Property
  onSelectApplicant: (applicantId: string) => void
  onDealCreated: (dealId: string) => void
}

/** Rendered inside PropertyDetailScreen — this property owner's applicants, ranked by match score. */
export function SuggestedApplicantsSection({
  property,
  onSelectApplicant,
  onDealCreated
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { matches, isLoading, error, refetch } = useApplicantMatchesForProperty(property)

  return (
    <View style={styles.section}>
      <Text style={[theme.typography('titleMd'), styles.heading]}>متقاضیان مناسب</Text>

      {isLoading ? (
        <View style={styles.centeredSection}>
          <LoadingIndicator size="small" />
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
        <View style={styles.list}>
          {matches?.map((match) => (
            <Card key={match.applicant.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={match.applicant.fullName}
                onPress={() => onSelectApplicant(match.applicant.id)}
              >
                <Text style={[theme.typography('titleSm'), styles.title]}>
                  {match.applicant.fullName}
                </Text>
                <Text style={[theme.typography('bodySm'), styles.subtitle]}>
                  {match.applicant.city} — {match.applicant.phoneNumber}
                </Text>
                <MatchScoreBadge score={match.score} />
                <Text style={[theme.typography('labelSm'), styles.reason]}>
                  {match.matchedCriteria.map((criterion) => CRITERION_LABELS[criterion]).join('، ')}
                </Text>
              </Pressable>
              <CreateDealButton
                userId={property.ownerId}
                propertyId={property.id}
                applicantId={match.applicant.id}
                onCreated={onDealCreated}
              />
            </Card>
          ))}
        </View>
      )}
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing.space3
    },
    heading: {
      color: theme.colors.onSurface
    },
    list: {
      gap: theme.spacing.space3
    },
    title: {
      color: theme.colors.onSurface
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1
    },
    reason: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space2
    },
    centeredSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.space6
    }
  })
}
