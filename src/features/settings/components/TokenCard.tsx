import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Icon } from '@shared/components'
import { SheetModal } from '@shared/components/SheetModal'
import { useTheme, type Theme } from '@shared/theme'
import {
  formatTokenAmount,
  tokenLevel,
  tokenTotal,
  usedShare,
  type TokenSummary
} from '../services/tokenLedger'

type Props = {
  summary: TokenSummary | null
  /** false = the copy kept on the phone (no internet) */
  fresh: boolean
  /**
   * Amin #5245: buying, shown once 95% is used. `open` false = the button is off and `hint` says why (no price yet,
   * not open for this account). Absent = no buy row (offline, or not asked yet).
   */
  buy?: { open: boolean; hint: string | null } | null
  onBuy?: () => void
  /** the receipts of earlier purchases (shown in the details when something was bought) */
  onReceipts?: () => void
}

/**
 * Amin #5103/#5106: the token card in Settings, as it was before the history page: how much is used of the whole,
 * a small line, and a bar — green, yellow once less than 30% is left, red once 95% is used. The ⓘ opens where the
 * tokens came from and where they went.
 */
export function TokenCard({ summary, fresh, buy, onBuy, onReceipts }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [isDetailVisible, setIsDetailVisible] = useState(false)

  const share = summary ? usedShare(summary) : 0
  const level = tokenLevel(share)
  const fill = level === 'danger' ? theme.colors.error : level === 'warn' ? theme.colors.warning : theme.colors.success

  return (
    <View style={styles.card} accessibilityLabel="توکن‌ها">
      <View style={styles.head}>
        <View style={styles.iconTile}>
          <Icon name="token" size="sm" color={theme.colors.primary} />
        </View>
        <Text style={[theme.typography('titleSm'), styles.title]}>توکن‌ها</Text>
        {summary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="جزئیات توکن‌ها"
            hitSlop={theme.spacing.space2}
            onPress={() => setIsDetailVisible(true)}
            style={styles.info}
          >
            <Icon name="info" size="sm" color={theme.colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>

      {summary ? (
        <>
          <Text style={[theme.typography('bodySm'), styles.value]}>
            {`${formatTokenAmount(summary.spent)} از ${formatTokenAmount(tokenTotal(summary))} توکن مصرف شده`}
          </Text>
          <View style={styles.track} accessibilityLabel={`${Math.round(share * 100)} درصد مصرف شده`}>
            <View style={[styles.fill, { backgroundColor: fill, width: `${Math.max(summary.spent > 0 ? 1.5 : 0, share * 100)}%` }]} />
          </View>
          {/* Amin #5554: no invite-gift line under the bar (was #5351) */}
          {level !== 'ok' ? (
            <Text style={[theme.typography('labelSm'), level === 'danger' ? styles.danger : styles.warn]}>
              {level === 'danger' ? 'توکن‌ها تقریباً تمام شده است.' : 'کمتر از ۳۰٪ توکن‌ها مانده است.'}
            </Text>
          ) : null}
          {level === 'danger' && buy && onBuy ? (
            <>
              <Button label="خرید توکن" onPress={onBuy} disabled={!buy.open} />
              {!buy.open && buy.hint ? (
                <Text style={[theme.typography('labelSm'), styles.muted]}>{buy.hint}</Text>
              ) : null}
            </>
          ) : null}
          {!fresh ? (
            <Text style={[theme.typography('labelSm'), styles.muted]}>آخرین موجودیِ ذخیره‌شده؛ با اینترنت به‌روز می‌شود.</Text>
          ) : null}
        </>
      ) : (
        <Text style={[theme.typography('bodySm'), styles.muted]}>موجودی توکن با اتصال به اینترنت نمایش داده می‌شود.</Text>
      )}

      {summary ? (
        <TokenBreakdownSheet
          summary={summary}
          visible={isDetailVisible}
          onClose={() => setIsDetailVisible(false)}
          onReceipts={
            onReceipts && summary.bought > 0
              ? () => {
                  setIsDetailVisible(false)
                  onReceipts()
                }
              : undefined
          }
        />
      ) : null}
    </View>
  )
}

function TokenBreakdownSheet({
  summary,
  visible,
  onClose,
  onReceipts
}: {
  summary: TokenSummary
  visible: boolean
  onClose: () => void
  onReceipts?: () => void
}): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme, insets.bottom)
  const level = tokenLevel(usedShare(summary))
  const balanceColor =
    level === 'danger' ? theme.colors.error : level === 'warn' ? theme.colors.onWarningContainer : theme.colors.onSurface

  return (
    <SheetModal visible={visible} onClose={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={[theme.typography('titleMd'), styles.title]}>جزئیات توکن‌ها</Text>

          <View style={styles.group}>
            <Text style={[theme.typography('labelMd'), styles.groupTitle]}>دریافتی</Text>
            <Line styles={styles} theme={theme} label="سهمیهٔ حساب" value={summary.allowance} />
            <Line styles={styles} theme={theme} label="هدیهٔ معرفی همکار" value={summary.earnedBy.referral} />
            <Line styles={styles} theme={theme} label="هدیهٔ تکمیل پروفایل" value={summary.earnedBy.profile} />
            {/* Amin #6400: what support added (add, fill or release of capacity) */}
            {summary.earnedBy.granted > 0 ? (
              <Line styles={styles} theme={theme} label="افزودن ظرفیت توسط پشتیبانی" value={summary.earnedBy.granted} />
            ) : null}
            <Line styles={styles} theme={theme} label="خرید بستهٔ توکن" value={summary.bought} />
            <Line styles={styles} theme={theme} label="جمع" value={tokenTotal(summary)} strong />
          </View>

          <View style={styles.group}>
            <Text style={[theme.typography('labelMd'), styles.groupTitle]}>مصرف</Text>
            <Line styles={styles} theme={theme} label="فایل‌های ملک" value={summary.spentBy.files} />
            <Line styles={styles} theme={theme} label="متقاضیان" value={summary.spentBy.applicants} />
            <Line styles={styles} theme={theme} label="قراردادها" value={summary.spentBy.contracts} />
            <Line styles={styles} theme={theme} label="تغییر شماره" value={summary.spentBy.phoneChange} />
            {/* Navid 2026-10-27: Divar posts read into new files (Amin #5658: 100 each, not returned) */}
            {summary.spentBy.divarImport > 0 ? (
              <Line styles={styles} theme={theme} label="ورود آگهی از دیوار" value={summary.spentBy.divarImport} />
            ) : null}
            {summary.spentBy.deducted > 0 ? (
              <Line styles={styles} theme={theme} label="کسر ظرفیت توسط پشتیبانی" value={summary.spentBy.deducted} />
            ) : null}
            <Line styles={styles} theme={theme} label="جمع" value={summary.spent} strong />
          </View>

          <View style={styles.balanceRow}>
            <Text style={[theme.typography('titleSm'), styles.title]}>مانده</Text>
            <Text style={[theme.typography('titleSm'), { color: balanceColor }]}>
              {`${formatTokenAmount(summary.balance)} توکن`}
            </Text>
          </View>
          {onReceipts ? <Button label="رسیدهای خرید" variant="text" onPress={onReceipts} /> : null}
          {/* Amin #5163: no explanation under the figures */}
        </View>
    </SheetModal>
  )
}

function Line({
  label,
  value,
  strong,
  styles,
  theme
}: {
  label: string
  value: number
  strong?: boolean
  styles: ReturnType<typeof createStyles>
  theme: Theme
}): React.JSX.Element {
  return (
    <View style={[styles.line, strong && styles.lineStrong]}>
      <Text style={[theme.typography(strong ? 'labelMd' : 'bodySm'), strong ? styles.title : styles.muted]}>{label}</Text>
      <Text style={[theme.typography(strong ? 'labelMd' : 'bodySm'), styles.title]}>{formatTokenAmount(value)}</Text>
    </View>
  )
}

function createStyles(theme: Theme, bottomInset = 0) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space2
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space2 },
    iconTile: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    info: { marginStart: 'auto', padding: theme.spacing.space1 },
    title: { color: theme.colors.onSurface },
    value: { color: theme.colors.onSurface, alignSelf: start },
    muted: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    warn: { color: theme.colors.onWarningContainer, alignSelf: start },
    danger: { color: theme.colors.error, alignSelf: start },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceContainerLow,
      overflow: 'hidden',
      flexDirection: 'row'
    },
    fill: { height: 8, borderRadius: 4 },
    sheet: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderTopLeftRadius: theme.radius.extraLarge,
      borderTopRightRadius: theme.radius.extraLarge,
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingTop: theme.spacing.space3,
      paddingBottom: theme.spacing.space6 + bottomInset,
      gap: theme.spacing.space3
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outlineVariant
    },
    group: {
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      paddingHorizontal: theme.spacing.space3,
      paddingVertical: theme.spacing.space2
    },
    groupTitle: { color: theme.colors.primary, alignSelf: start, marginBottom: theme.spacing.space1 },
    line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    lineStrong: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      marginTop: theme.spacing.space1,
      paddingTop: theme.spacing.space2
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.space3
    }
  })
}
