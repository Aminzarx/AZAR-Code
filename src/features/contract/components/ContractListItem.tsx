import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card, MarqueeText } from '@shared/components'
import { toPersianDigits } from '@shared/utils/persianText'
import { formatJalaliDate, gregorianIsoToJalali } from '@shared/utils/jalaliDate'
import { moneyLine } from '@shared/utils/shortMoney'
import { CONTRACT_STATUS_LABELS } from '../statusPresentation'
import type { ContractWithDetails } from '../types'

type Props = {
  contract: ContractWithDetails
  onPress: () => void
  /** v1.4.0: long-press opens the row's action sheet (delete) */
  onLongPress?: () => void
  /** v1.4.0: «یادآوری تمدید» on a contract that is near its end */
  onRenewReminder?: () => void
}

/** a contract within this many days of its end is «رو به پایان» */
export const ENDING_SOON_DAYS = 30

/** whole days from today to the contract's end date (negative once past) */
export function daysLeft(endDate: string, now: Date = new Date()): number | null {
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(end.getTime())) {
    return null
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
}

export function isEndingSoon(contract: ContractWithDetails, now: Date = new Date()): boolean {
  if (contract.status !== 'active') {
    return false
  }
  const days = daysLeft(contract.endDate, now)
  return days !== null && days <= ENDING_SOON_DAYS
}

function jalali(isoDate: string): string | null {
  const date = gregorianIsoToJalali(isoDate.slice(0, 10))
  return date ? toPersianDigits(formatJalaliDate(date)) : null
}

/**
 * v1.4.0 (design batch 3, approved «قراردادها» mockup): the contract's
 * kind and file, the two sides, the amount, a days-left (or status) tag,
 * then the end date with «یادآوری تمدید» or «جزئیات».
 */
export function ContractListItem({ contract, onPress, onLongPress, onRenewReminder }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const label = `${contract.property?.title ?? 'ملک نامشخص'} - ${contract.applicant?.fullName ?? 'متقاضی نامشخص'}`
  const property = contract.property
  const title = [contract.type, property?.title ?? 'ملک نامشخص'].filter(Boolean).join(' ')
  const sides = contract.applicant?.fullName ?? 'متقاضی نامشخص'
  const terms =
    contract.amount !== null && contract.amount > 0
      ? moneyLine(contract.amount, null, null)
      : property
        ? moneyLine(null, property.depositAmount, property.rentAmount)
        : null
  const endingSoon = isEndingSoon(contract)
  const days = daysLeft(contract.endDate)
  const endText = jalali(contract.endDate)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onLongPress={onLongPress} delayLongPress={350}>
      <Card>
        <View style={styles.titleRow}>
          <MarqueeText style={[theme.typography('titleSm'), styles.title]}>
            {title}
          </MarqueeText>
          {endingSoon && days !== null ? (
            <View style={[styles.tag, styles.tagWarn]}>
              <Text style={[theme.typography('labelSm'), styles.tagWarnText]}>
                {days >= 0 ? `${toPersianDigits(String(days))} روز مانده` : 'سررسید گذشته'}
              </Text>
            </View>
          ) : (
            <View style={[styles.tag, contract.status === 'active' ? styles.tagOk : styles.tagNeutral]}>
              <Text style={[theme.typography('labelSm'), contract.status === 'active' ? styles.tagOkText : styles.tagNeutralText]}>
                {CONTRACT_STATUS_LABELS[contract.status]}
              </Text>
            </View>
          )}
        </View>
        <MarqueeText style={[theme.typography('bodySm'), styles.muted]}>
          {sides}
        </MarqueeText>
        {terms ? (
          <MarqueeText style={[theme.typography('bodyMd'), styles.terms]}>
            {terms}
          </MarqueeText>
        ) : null}
        <View style={styles.footer}>
          <Text style={[theme.typography('labelSm'), styles.muted]}>{endText ? `پایان: ${endText}` : ''}</Text>
          {endingSoon && onRenewReminder ? (
            <Pressable accessibilityRole="button" accessibilityLabel="یادآوری تمدید" onPress={onRenewReminder} hitSlop={8}>
              <Text style={[theme.typography('labelMd'), styles.action]}>یادآوری تمدید</Text>
            </Pressable>
          ) : (
            <Text style={[theme.typography('labelMd'), styles.action]}>جزئیات</Text>
          )}
        </View>
      </Card>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    title: { color: theme.colors.onSurface, flexShrink: 1 },
    muted: { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.space1, alignSelf: start },
    terms: { color: theme.colors.onSurface, marginTop: theme.spacing.space1, alignSelf: start },
    tag: {
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: 2,
      borderRadius: theme.radius.full
    },
    tagWarn: { backgroundColor: theme.colors.warningContainer },
    tagWarnText: { color: theme.colors.onWarningContainer },
    tagOk: { backgroundColor: theme.colors.successContainer },
    tagOkText: { color: theme.colors.onSuccessContainer },
    tagNeutral: { backgroundColor: theme.colors.surfaceContainer },
    tagNeutralText: { color: theme.colors.onSurfaceVariant },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.space3,
      paddingTop: theme.spacing.space3,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant
    },
    action: { color: theme.colors.primary, fontWeight: '700' }
  })
}
