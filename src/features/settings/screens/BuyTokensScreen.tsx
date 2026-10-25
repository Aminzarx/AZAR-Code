import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme, type Theme } from '@shared/theme'
import { Button, FormScreenContainer, Icon, TextInput } from '@shared/components'
import { useAuth } from '@features/auth/AuthProvider'
import { formatDateTime } from '@shared/utils/formatDate'
import { toEnglishDigits, toPersianDigits } from '@shared/utils/persianText'
import type { MainStackParamList } from '@navigation/MainNavigator'
import {
  closedReasonText,
  formatToman,
  formatTokens,
  newPurchaseKey,
  PurchaseRefusedError,
  type PurchaseOffer,
  type PurchaseQuote,
  type TokenOrder
} from '../services/tokenPurchase'

type Props = NativeStackScreenProps<MainStackParamList, 'BuyTokens'>

function errorText(error: unknown): string {
  return closedReasonText(error instanceof PurchaseRefusedError ? error.code : null)
}

/**
 * Amin #5245: «خرید توکن». The price comes from the server (kss-pricing); the app opens the bank's page and, when the
 * user comes back, asks the order's status. Tokens are added only after the payment is verified. The receipts of
 * earlier purchases are on the same page.
 */
export function BuyTokensScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { tokenPurchase } = useAuth()
  const receiptsOnly = route.params?.receipts === true
  const [offer, setOffer] = useState<PurchaseOffer | null>(null)
  const [count, setCount] = useState('')
  const [quote, setQuote] = useState<PurchaseQuote | null>(null)
  const [order, setOrder] = useState<TokenOrder | null>(null)
  const [receipts, setReceipts] = useState<TokenOrder[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // one key per buying attempt: a retry after a lost answer finds the same order instead of making a second one
  const key = useRef(newPurchaseKey())

  const loadReceipts = useCallback(() => {
    tokenPurchase
      ?.receipts()
      .then(setReceipts)
      .catch(() => undefined)
  }, [tokenPurchase])

  useEffect(() => {
    loadReceipts()
    if (receiptsOnly || !tokenPurchase) return
    tokenPurchase
      .quote()
      .then(setOffer)
      .catch((caught) => setError(errorText(caught)))
  }, [tokenPurchase, receiptsOnly, loadReceipts])

  const tokens = Number(toEnglishDigits(count).replace(/[^0-9]/g, ''))
  const validCount = offer !== null && Number.isInteger(tokens) && tokens >= offer.minTokens && tokens <= offer.maxTokens

  // the server's price for the typed count, asked a moment after typing stops
  useEffect(() => {
    setQuote(null)
    if (!tokenPurchase || !offer?.open || !validCount) return undefined
    const timer = setTimeout(() => {
      tokenPurchase
        .quote(tokens)
        .then((next) => {
          setOffer(next)
          setQuote(next.quote)
        })
        .catch((caught) => setError(errorText(caught)))
    }, 400)
    return () => clearTimeout(timer)
  }, [tokenPurchase, tokens, offer?.open, validCount])

  const checkOrder = useCallback(
    async (current: TokenOrder) => {
      if (!tokenPurchase) return
      try {
        const next = await tokenPurchase.status(current.id)
        setOrder(next)
        if (next.status === 'paid') loadReceipts()
      } catch (caught) {
        setError(errorText(caught))
      }
    },
    [tokenPurchase, loadReceipts]
  )

  // back from the bank's page: ask how the payment went
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && order?.status === 'pending') checkOrder(order)
    })
    return () => subscription.remove()
  }, [order, checkOrder])

  async function pay(): Promise<void> {
    if (!tokenPurchase || !validCount) return
    setError(null)
    setIsBusy(true)
    try {
      const result = await tokenPurchase.buy(tokens, key.current)
      setOrder(result.order)
      if (result.order.status === 'paid') loadReceipts()
      else if (result.payUrl) await Linking.openURL(result.payUrl)
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setIsBusy(false)
    }
  }

  function startOver(): void {
    key.current = newPurchaseKey()
    setOrder(null)
    setError(null)
  }

  const pending = order?.status === 'pending'
  // the receipt just shown above is not repeated in the list below
  const earlier = receipts.filter((r) => !(order?.status === 'paid' && r.id === order.id))
  const footer = receiptsOnly ? undefined : order?.status === 'paid' ? (
    <Button label="بازگشت به تنظیمات" onPress={() => navigation.goBack()} />
  ) : pending ? (
    <Button label="بررسی پرداخت" onPress={() => order && checkOrder(order)} />
  ) : order ? (
    <Button label="خرید دوباره" onPress={startOver} />
  ) : (
    <Button label="تأیید و پرداخت" onPress={pay} loading={isBusy} disabled={!offer?.open || !quote} />
  )

  return (
    <FormScreenContainer
      headerTitle={receiptsOnly ? 'رسیدهای خرید' : 'خرید توکن'}
      onBack={() => navigation.goBack()}
      footer={footer}
    >
      {receiptsOnly ? null : order ? (
        <OrderState order={order} theme={theme} styles={styles} />
      ) : offer && !offer.open ? (
        <Text style={[theme.typography('bodyMd'), styles.line]}>{closedReasonText(offer.reason)}</Text>
      ) : offer ? (
        <>
          {offer.sandbox ? (
            <Text style={[theme.typography('labelSm'), styles.muted]}>پرداخت آزمایشی است؛ پولی جابه‌جا نمی‌شود.</Text>
          ) : null}
          {offer.unitToman !== null ? (
            <Text style={[theme.typography('bodyMd'), styles.line]}>{`قیمت هر توکن: ${formatToman(offer.unitToman)}`}</Text>
          ) : null}
          <TextInput
            label="تعداد توکن"
            required
            value={count}
            onChangeText={(text) => {
              setCount(toPersianDigits(toEnglishDigits(text).replace(/[^0-9]/g, '')))
              setError(null)
            }}
            placeholder="۵۰۰"
            keyboardType="number-pad"
            maxLength={7}
            helperText={`از ${formatTokens(offer.minTokens)} تا ${formatTokens(offer.maxTokens)}`}
          />
          {quote ? (
            <View style={styles.box}>
              <Row theme={theme} styles={styles} label="بدون مالیات" value={formatToman(quote.baseToman)} />
              <Row theme={theme} styles={styles} label="مالیات بر ارزش افزوده" value={formatToman(quote.vatToman)} />
              <Row theme={theme} styles={styles} label="مبلغ پرداختی" value={formatToman(quote.totalToman)} strong />
            </View>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}

      {earlier.length > 0 ? (
        <View style={styles.receipts}>
          <Text style={[theme.typography('titleSm'), styles.line]}>رسیدهای خرید</Text>
          {earlier.map((r) => (
            <Receipt key={r.id} order={r} theme={theme} styles={styles} />
          ))}
        </View>
      ) : receiptsOnly ? (
        <Text style={[theme.typography('bodyMd'), styles.muted]}>هنوز خریدی ثبت نشده است.</Text>
      ) : null}
    </FormScreenContainer>
  )
}

function OrderState({ order, theme, styles }: { order: TokenOrder; theme: Theme; styles: Styles }): React.JSX.Element {
  if (order.status === 'paid') {
    return (
      <View style={styles.done}>
        <View style={styles.doneIcon}>
          <Icon name="check" size="lg" color={theme.colors.onPrimary} />
        </View>
        <Text style={[theme.typography('titleMd'), styles.line]}>{`${formatTokens(order.tokens)} به حساب شما اضافه شد`}</Text>
        <Receipt order={order} theme={theme} styles={styles} />
      </View>
    )
  }
  const text =
    order.status === 'pending'
      ? 'پرداخت در صفحهٔ بانک باز شد. پس از پرداخت به اپ برگردید؛ نتیجه همین‌جا نشان داده می‌شود.'
      : order.status === 'expired'
        ? 'زمان این پرداخت تمام شد و توکنی اضافه نشد. اگر مبلغی کم شده باشد، بانک آن را برمی‌گرداند.'
        : 'پرداخت انجام نشد و توکنی اضافه نشد. اگر مبلغی کم شده باشد، بانک آن را برمی‌گرداند.'
  return <Text style={[theme.typography('bodyMd'), styles.line]}>{text}</Text>
}

function Receipt({ order, theme, styles }: { order: TokenOrder; theme: Theme; styles: Styles }): React.JSX.Element {
  return (
    <View style={styles.box} accessibilityLabel="رسید خرید">
      <Row theme={theme} styles={styles} label="کد پیگیری" value={order.refId ? toPersianDigits(order.refId) : '—'} />
      <Row theme={theme} styles={styles} label="تاریخ و ساعت" value={formatDateTime(order.paidAt ?? order.createdAt)} />
      <Row theme={theme} styles={styles} label="تعداد توکن" value={formatTokens(order.tokens)} />
      <Row theme={theme} styles={styles} label="مالیات بر ارزش افزوده" value={formatToman(order.vatToman)} />
      <Row theme={theme} styles={styles} label="مبلغ پرداختی" value={formatToman(order.totalToman)} strong />
      {order.sandbox ? <Text style={[theme.typography('labelSm'), styles.muted]}>پرداخت آزمایشی</Text> : null}
    </View>
  )
}

function Row({
  label,
  value,
  strong,
  theme,
  styles
}: {
  label: string
  value: string
  strong?: boolean
  theme: Theme
  styles: Styles
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={[theme.typography(strong ? 'labelMd' : 'bodySm'), strong ? styles.line : styles.muted]}>{label}</Text>
      <Text style={[theme.typography(strong ? 'labelMd' : 'bodySm'), styles.line]}>{value}</Text>
    </View>
  )
}

type Styles = ReturnType<typeof createStyles>

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    line: { color: theme.colors.onSurface, alignSelf: start },
    muted: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    error: { color: theme.colors.error, alignSelf: start },
    box: {
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceContainerLowest,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space2,
      alignSelf: 'stretch'
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: theme.spacing.space3 },
    receipts: { gap: theme.spacing.space3, marginTop: theme.spacing.space4 },
    done: { alignItems: 'center', gap: theme.spacing.space3 },
    doneIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.success,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
