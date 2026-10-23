import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { moneyLine, relativeDay } from '@shared/utils/shortMoney'
import type { Property } from '../types'

type Props = {
  property: Property
  onPress: () => void
  /**
   * Count of applicants the matching engine considers suitable for this
   * property, computed once at screen level (no per-row query) and
   * passed down. `undefined` while not yet computed.
   */
  matchCount?: number
}

/**
 * v1.3.0 (design batch 2, approved «فایل‌ها» mockup): title with the deal
 * type tag, area and rooms, the price as a broker says it, then a footer
 * with the suitable-applicant count and how long ago the file was added.
 */
export function PropertyListItem({ property, onPress, matchCount }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const price = moneyLine(property.price, property.depositAmount, property.rentAmount)
  const location = [property.city, property.address].filter(Boolean).join('، ')
  const specs = [
    property.area !== null ? `${toPersianDigits(String(property.area))} متر` : null,
    property.rooms !== null ? `${toPersianDigits(String(property.rooms))} اتاق` : null,
    property.propertyType
  ].filter((part): part is string => Boolean(part))

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={property.title} onPress={onPress}>
      <Card>
        <View style={styles.titleRow}>
          <Text
            style={[theme.typography('titleSm'), styles.title]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {property.title}
          </Text>
          {property.transactionType ? (
            <View style={styles.tag}>
              <Text style={[theme.typography('labelSm'), styles.tagText]}>
                {property.transactionType}
              </Text>
            </View>
          ) : null}
        </View>
        {location ? (
          <Text
            style={[theme.typography('bodySm'), styles.muted]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {location}
          </Text>
        ) : null}
        {specs.length > 0 ? (
          <Text style={[theme.typography('bodySm'), styles.muted]} numberOfLines={1}>
            {specs.join('   ')}
          </Text>
        ) : null}
        {price ? (
          <Text style={[theme.typography('titleMd'), styles.price]} numberOfLines={1}>
            {price}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {property.status === 'archived' ? (
            <View style={[styles.pill, styles.pillNeutral]}>
              <Text style={[theme.typography('labelSm'), styles.pillNeutralText]}>بایگانی</Text>
            </View>
          ) : matchCount ? (
            <View style={[styles.pill, styles.pillPositive]}>
              <View style={styles.dot} />
              <Text style={[theme.typography('labelSm'), styles.pillPositiveText]}>
                {`${toPersianDigits(String(matchCount))} متقاضی مناسب`}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={[theme.typography('labelSm'), styles.age]}>
            {relativeDay(property.createdAt)}
          </Text>
        </View>
      </Card>
    </Pressable>
  )
}

export function createListCardStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    tag: {
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: 2,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.surfaceContainer
    },
    tagText: { color: theme.colors.onSurfaceVariant },
    muted: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: start
    },
    price: {
      color: theme.colors.onSurface,
      marginTop: theme.spacing.space2,
      alignSelf: start
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.space3,
      paddingTop: theme.spacing.space3,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space1,
      borderRadius: theme.radius.full
    },
    pillPositive: { backgroundColor: theme.colors.successContainer },
    pillPositiveText: { color: theme.colors.onSuccessContainer },
    pillNeutral: { backgroundColor: theme.colors.surfaceContainer },
    pillNeutralText: { color: theme.colors.onSurfaceVariant },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success },
    age: { color: theme.colors.onSurfaceVariant }
  })
}

const createStyles = createListCardStyles
