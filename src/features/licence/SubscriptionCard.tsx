import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Icon } from '@shared/components'
import { useLicence, type Licence } from '@shared/licence/LicenceContext'
import { formatDate } from '@shared/utils/formatDate'
import { toPersianDigits } from '@shared/utils/persianText'
import { daysLeft } from './LicenceBanner'

/** «۲۹۰٬۰۰۰» */
function toman(value: number): string {
  return toPersianDigits(String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'))
}

const BADGE: Record<Licence['state'], string> = {
  trial: 'آزمایشی',
  active: 'فعال',
  free: 'رایگان',
  expired: 'تمام شده',
  unknown: 'در حال بررسی'
}

function statusLine(licence: Licence): string {
  const left = daysLeft(licence.endsAt)
  switch (licence.state) {
    case 'trial':
      return licence.trialDays
        ? `${toPersianDigits(String(left ?? 0))} روز از ${toPersianDigits(String(licence.trialDays))} روز آزمایشی مانده`
        : `${toPersianDigits(String(left ?? 0))} روز از دورهٔ آزمایشی مانده`
    case 'active':
      return licence.endsAt ? `فعال تا ${formatDate(licence.endsAt)}` : 'فعال'
    case 'expired':
      return 'تمام شده؛ پرونده‌ها سر جایشان است و فقط خواندنی‌اند.'
    default:
      return 'با وصل شدن اینترنت وضعیت اشتراک به‌روز می‌شود.'
  }
}

/**
 * Amin #4906: the subscription in «تنظیمات», right under who you are: its state, the days left of the free trial
 * (with a bar), the monthly price from kss-pricing and the renewal. Paying from the KSSX wallet is switched on after
 * the wallet go-ahead (#4899); until then the button says so instead of failing.
 */
export function SubscriptionCard(): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const licence = useLicence()
  const left = daysLeft(licence.endsAt)
  const ended = licence.state === 'expired'
  const trialShare =
    licence.state === 'trial' && licence.trialDays && left !== null ? Math.min(1, left / licence.trialDays) : null
  const canRenew = licence.state !== 'free'
  // Amin #5245: a free account sees no subscription card at all (no «free» wording while everyone is free)
  if (licence.state === 'free') return null

  return (
    <View style={[styles.card, ended && styles.cardEnded]} accessibilityLabel="اشتراک ایوان">
      <View style={styles.head}>
        <View style={[styles.icon, ended && styles.iconEnded]}>
          <Icon name={ended ? 'lock' : 'ribbon'} size="sm" color={ended ? theme.colors.error : theme.colors.primary} />
        </View>
        <Text style={[theme.typography('titleSm'), styles.title]}>اشتراک ایوان</Text>
        <View style={[styles.badge, ended && styles.badgeEnded]}>
          <Text style={[theme.typography('labelSm'), ended ? styles.badgeEndedText : styles.badgeText]}>
            {BADGE[licence.state]}
          </Text>
        </View>
      </View>

      <Text style={[theme.typography('bodyMd'), styles.status]}>{statusLine(licence)}</Text>
      {trialShare !== null ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(3, trialShare * 100)}%` }]} />
        </View>
      ) : null}

      {canRenew ? (
        <>
          <View style={styles.priceRow}>
            <Text style={[theme.typography('bodySm'), styles.muted]}>تمدید ماهانه</Text>
            <Text style={[theme.typography('titleSm'), styles.price]}>
              {licence.monthlyToman !== null ? `${toman(licence.monthlyToman)} تومان` : 'به‌زودی اعلام می‌شود'}
            </Text>
          </View>
          {/* Amin #4906: payment is wired after the wallet go-ahead (#4899) */}
          <Button label="تمدید اشتراک" onPress={() => undefined} disabled />
          <Text style={[theme.typography('labelSm'), styles.muted]}>
            پرداخت از کیف پول KSSX به‌زودی همین‌جا فعال می‌شود.
          </Text>
        </>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space3
    },
    cardEnded: { borderColor: theme.colors.error },
    head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2 },
    icon: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    iconEnded: { backgroundColor: theme.colors.errorContainer },
    title: { flex: 1, color: theme.colors.onSurface },
    badge: {
      paddingHorizontal: theme.spacing.space2,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryContainer
    },
    badgeEnded: { backgroundColor: theme.colors.errorContainer },
    badgeText: { color: theme.colors.primary },
    badgeEndedText: { color: theme.colors.onErrorContainer },
    status: { color: theme.colors.onSurface, alignSelf: start },
    track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceContainerLow, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muted: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    price: { color: theme.colors.onSurface }
  })
}
