import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from '@shared/components'
import { useLicence } from '@shared/licence/LicenceContext'
import { toPersianDigits } from '@shared/utils/persianText'

const DAY = 24 * 60 * 60 * 1000

/** Whole days left until `endsAt` (at least 1 while it has not ended). */
export function daysLeft(endsAt: string | null, now = Date.now()): number | null {
  if (!endsAt) return null
  const ms = Date.parse(endsAt) - now
  return ms <= 0 ? 0 : Math.max(1, Math.ceil(ms / DAY))
}

/**
 * Amin #4906: a slim line on Home — when the licence has ended (the files are read-only) or the free trial has
 * three days or less left. Tapping it opens the subscription in «تنظیمات». Nothing shows otherwise.
 */
export function LicenceBanner({ onOpen }: { onOpen: () => void }): React.JSX.Element | null {
  const theme = useTheme()
  const styles = createStyles(theme)
  const licence = useLicence()
  const left = daysLeft(licence.endsAt)
  const ended = !licence.canEdit
  if (!ended && !(licence.state === 'trial' && left !== null && left <= 3)) return null
  const text = ended
    ? 'اشتراک تمام شده؛ پرونده‌ها فقط خواندنی‌اند'
    : `${toPersianDigits(String(left))} روز از دورهٔ آزمایشی مانده`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}؛ تمدید اشتراک`}
      onPress={onOpen}
      style={[styles.banner, ended ? styles.ended : styles.soon]}
    >
      <Icon name={ended ? 'lock' : 'time'} size="sm" color={ended ? theme.colors.onErrorContainer : theme.colors.onWarningContainer} />
      <View style={styles.textBox}>
        <Text style={[theme.typography('labelMd'), ended ? styles.endedText : styles.soonText]}>{text}</Text>
      </View>
      <Text style={[theme.typography('labelMd'), ended ? styles.endedText : styles.soonText]}>تمدید</Text>
    </Pressable>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space4,
      minHeight: theme.touchTargetMinimum,
      borderRadius: theme.radius.large
    },
    ended: { backgroundColor: theme.colors.errorContainer },
    soon: { backgroundColor: theme.colors.warningContainer },
    textBox: { flex: 1 },
    endedText: { color: theme.colors.onErrorContainer },
    soonText: { color: theme.colors.onWarningContainer }
  })
}
