import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { EmptyState, LoadingIndicator, ScreenHeaderBar } from '@shared/components'
import { useTheme, type Theme } from '@shared/theme'
import { formatJalaliDate, gregorianIsoToJalali } from '@shared/utils/jalaliDate'
import { toPersianDigits } from '@shared/utils/persianText'
import {
  formatTokenAmount,
  tokenReasonLabel,
  type TokenLedger,
  type TokenLedgerRow
} from '../services/tokenLedger'

type Props = NativeStackScreenProps<MainStackParamList, 'TokenLedger'>

function rowDate(at: string): string {
  const date = gregorianIsoToJalali(at.slice(0, 10))
  return date ? toPersianDigits(formatJalaliDate(date)) : ''
}

/**
 * Amin #5052/#5054: «تنظیمات › کارنامهٔ توکن». The balance with where it came from (allowance, earned, bought, spent)
 * and the history: date, reason, ± tokens. Offline it shows the last answer kept on the phone, with the changes that
 * are still waiting to be sent (the server books them when they arrive).
 */
export function TokenLedgerScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { getTokenLedger, sync } = useAuth()
  const [ledger, setLedger] = useState<TokenLedger | null>(null)
  const [fresh, setFresh] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getTokenLedger()
      .then((result) => {
        setLedger(result?.ledger ?? null)
        setFresh(result?.fresh ?? false)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [getTokenLedger])

  useEffect(load, [load])

  const summary = ledger?.summary
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeaderBar onBack={() => navigation.goBack()} title="کارنامهٔ توکن" />
      {loading && !ledger ? (
        <View style={styles.centered}>
          <LoadingIndicator size="large" />
        </View>
      ) : !ledger || !summary ? (
        <View style={styles.centered}>
          <EmptyState
            title="کارنامه فعلاً در دسترس نیست"
            description="با اتصال به اینترنت دوباره امتحان کنید."
            actionLabel="تلاش دوباره"
            onAction={load}
          />
        </View>
      ) : (
        <FlatList
          data={ledger.rows}
          keyExtractor={(row, index) => `${row.at}-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.colors.primary]} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.balanceCard} accessibilityLabel="موجودی توکن">
                <Text style={[theme.typography('bodySm'), styles.muted]}>موجودی</Text>
                <Text style={[theme.typography('headlineLgMobile'), styles.balance]}>
                  {`${formatTokenAmount(summary.balance)} توکن`}
                </Text>
                <View style={styles.parts}>
                  <Part label="آغاز حساب" value={summary.allowance} styles={styles} theme={theme} />
                  <Part label="هدیه" value={summary.earned} styles={styles} theme={theme} />
                  <Part label="خرید" value={summary.bought} styles={styles} theme={theme} />
                  <Part label="مصرف" value={summary.spent} styles={styles} theme={theme} />
                </View>
              </View>
              {!fresh || sync.pending > 0 ? (
                <Text style={[theme.typography('bodySm'), styles.pending]}>
                  {sync.pending > 0
                    ? `${toPersianDigits(String(sync.pending))} تغییر در انتظار ارسال؛ توکن آن‌ها پس از رسیدن به سرور حساب می‌شود.`
                    : 'آخرین کارنامهٔ ذخیره‌شده؛ با اینترنت به‌روز می‌شود.'}
                </Text>
              ) : null}
              <Text style={[theme.typography('titleSm'), styles.historyTitle]}>تاریخچه</Text>
            </View>
          }
          renderItem={({ item }) => <LedgerRow row={item} styles={styles} theme={theme} />}
        />
      )}
    </SafeAreaView>
  )
}

function Part({
  label,
  value,
  styles,
  theme
}: {
  label: string
  value: number
  styles: ReturnType<typeof createStyles>
  theme: Theme
}): React.JSX.Element {
  return (
    <View style={styles.part}>
      <Text style={[theme.typography('labelSm'), styles.muted]}>{label}</Text>
      <Text style={[theme.typography('labelMd'), styles.partValue]}>{formatTokenAmount(value)}</Text>
    </View>
  )
}

function LedgerRow({
  row,
  styles,
  theme
}: {
  row: TokenLedgerRow
  styles: ReturnType<typeof createStyles>
  theme: Theme
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[theme.typography('bodyMd'), styles.rowReason]}>{tokenReasonLabel(row.reason)}</Text>
        <Text style={[theme.typography('bodySm'), styles.muted]}>{rowDate(row.at)}</Text>
      </View>
      <Text
        style={[theme.typography('labelMd'), row.amount >= 0 ? styles.plus : styles.minus]}
        accessibilityLabel={`${row.amount >= 0 ? 'افزایش' : 'کاهش'} ${formatTokenAmount(row.amount)} توکن`}
      >
        {formatTokenAmount(row.amount, true)}
      </Text>
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: theme.spacing.space6, paddingBottom: theme.spacing.space8 },
    header: { gap: theme.spacing.space4, paddingTop: theme.spacing.space4, paddingBottom: theme.spacing.space2 },
    balanceCard: {
      gap: theme.spacing.space2,
      padding: theme.spacing.space5,
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant
    },
    muted: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    balance: { color: theme.colors.onSurface, alignSelf: start },
    parts: { flexDirection: 'row', gap: theme.spacing.space2, marginTop: theme.spacing.space2 },
    part: {
      flex: 1,
      gap: 2,
      padding: theme.spacing.space2,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.surfaceContainer
    },
    partValue: { color: theme.colors.onSurface, alignSelf: start },
    pending: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    historyTitle: { color: theme.colors.onSurface, alignSelf: start },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingVertical: theme.spacing.space3,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant
    },
    rowText: { flex: 1, gap: 2 },
    rowReason: { color: theme.colors.onSurface, alignSelf: start },
    plus: { color: theme.colors.onSuccessContainer },
    minus: { color: theme.colors.onSurface }
  })
}
