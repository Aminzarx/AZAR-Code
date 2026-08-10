import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import type { Applicant } from '@features/applicant/types'
import { usePropertyMatchesForApplicant } from '../hooks/usePropertyMatchesForApplicant'
import { MatchScoreBadge } from './MatchScoreBadge'
import { CreateDealButton } from './CreateDealButton'
import { CRITERION_LABELS } from '../services/matchingService'

type Props = {
  applicant: Applicant
  onSelectProperty: (propertyId: string) => void
  onDealCreated: (dealId: string) => void
}

/** Rendered inside ApplicantDetailScreen — this applicant's owner's properties, ranked by match score. */
export function SuggestedPropertiesSection({
  applicant,
  onSelectProperty,
  onDealCreated
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { matches, isLoading, error, refetch } = usePropertyMatchesForApplicant(applicant)

  return (
    <View style={styles.section}>
      <Text style={[theme.typography('titleMd'), styles.heading]}>ملک‌های پیشنهادی</Text>

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
          description="ملکی که با ترجیحات این متقاضی هم‌خوانی داشته باشد پیدا نشد."
        />
      ) : (
        <View style={styles.list}>
          {matches?.map((match) => (
            <Card key={match.property.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={match.property.title}
                onPress={() => onSelectProperty(match.property.id)}
              >
                <Text style={[theme.typography('titleSm'), styles.title]}>
                  {match.property.title}
                </Text>
                <Text style={[theme.typography('bodySm'), styles.subtitle]}>
                  {match.property.city} • {match.property.address}
                </Text>
                <MatchScoreBadge score={match.score} />
                <Text style={[theme.typography('labelSm'), styles.reason]}>
                  {match.matchedCriteria.map((criterion) => CRITERION_LABELS[criterion]).join('، ')}
                </Text>
              </Pressable>
              <CreateDealButton
                userId={applicant.userId}
                propertyId={match.property.id}
                applicantId={applicant.id}
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
