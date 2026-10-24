import React from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, Icon } from '@shared/components'
import { createListCardStyles } from '@features/property/components/PropertyListItem'
import { toPersianDigits } from '@shared/utils/persianText'
import { moneyLine, relativeDay, shortTomanRange } from '@shared/utils/shortMoney'
import type { Applicant } from '../types'

type Props = {
  applicant: Applicant
  onPress: () => void
  /** v1.4.0: long-press opens the row's action sheet (delete) */
  onLongPress?: () => void
  /** Suitable property files from the matching engine, computed once per screen. */
  matchCount?: number
}

function areaRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) {
    return null
  }
  if (min !== null && max !== null && min !== max) {
    return `${toPersianDigits(String(min))} تا ${toPersianDigits(String(max))} متر`
  }
  return `${toPersianDigits(String(min ?? max))} متر`
}

/**
 * v1.3.0 (design batch 2, approved «متقاضیان» mockup): name with a call
 * button, what they want and where, size and rooms, the budget as a
 * broker says it, then suitable files and how long ago they were added.
 */
export function ApplicantListItem({ applicant, onPress, matchCount, onLongPress }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createListCardStyles(theme)
  const own = createStyles(theme)
  const wants = [applicant.preferredTransactionType, applicant.preferredPropertyType]
    .filter(Boolean)
    .join(' ')
  const subtitle = [wants, applicant.city].filter(Boolean).join(' · ')
  const specs = [
    areaRange(applicant.minArea, applicant.maxArea),
    applicant.rooms !== null ? `${toPersianDigits(String(applicant.rooms))} اتاق` : null
  ].filter((part): part is string => Boolean(part))
  const budget =
    shortTomanRange(applicant.minBudget, applicant.maxBudget) ??
    moneyLine(null, applicant.depositAmount, applicant.rentAmount)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={applicant.fullName} onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}>
      <Card>
        <View style={styles.titleRow}>
          <View style={own.identity}>
            <Text
              style={[theme.typography('titleSm'), styles.title, own.name]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {applicant.fullName}
            </Text>
            {subtitle ? (
              <Text
                style={[theme.typography('bodySm'), styles.muted]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {applicant.phoneNumber ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تماس با ${applicant.fullName}`}
              onPress={() => {
                Linking.openURL(`tel:${applicant.phoneNumber}`).catch(() => undefined)
              }}
              style={own.callButton}
            >
              <Icon name="phone" size="sm" color={theme.colors.success} />
            </Pressable>
          ) : null}
        </View>
        {specs.length > 0 ? (
          <Text style={[theme.typography('bodySm'), styles.muted]} numberOfLines={1}>
            {specs.join('   ')}
          </Text>
        ) : null}
        {budget ? (
          <Text style={[theme.typography('titleMd'), styles.price]} numberOfLines={1}>
            {budget}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {applicant.status === 'archived' ? (
            <View style={[styles.pill, styles.pillNeutral]}>
              <Text style={[theme.typography('labelSm'), styles.pillNeutralText]}>غیرفعال</Text>
            </View>
          ) : matchCount ? (
            <View style={[styles.pill, styles.pillPositive]}>
              <View style={styles.dot} />
              <Text style={[theme.typography('labelSm'), styles.pillPositiveText]}>
                {`${toPersianDigits(String(matchCount))} فایل مناسب`}
              </Text>
            </View>
          ) : matchCount === 0 ? (
            <View style={[styles.pill, styles.pillNeutral]}>
              <Text style={[theme.typography('labelSm'), styles.pillNeutralText]}>
                هنوز فایل مناسبی نیست
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={[theme.typography('labelSm'), styles.age]}>
            {relativeDay(applicant.createdAt)}
          </Text>
        </View>
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    identity: { flex: 1, minWidth: 0 },
    // v1.4.0 (Amin #4318 «اسم متقاضی باید بره راست»): the name hugged the call button; it starts the line like the rows under it
    // (alignSelf as the subtitle under it, which lands right: a stretched Text fell back to the left edge)
    name: { alignSelf: theme.isRTL ? 'flex-start' : 'flex-end', maxWidth: '100%' },
    callButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
