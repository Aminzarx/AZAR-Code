import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import {
  daysInJalaliMonth,
  jalaliMonthName,
  todayJalali,
  type JalaliDate
} from '@shared/utils/jalaliDate'

type Props = {
  value: JalaliDate | null
  onSelect: (date: JalaliDate) => void
}

/**
 * A Jalali (Persian) calendar grid — year and month are each adjustable
 * independently (product requirement: not just a single "next/previous
 * month" control), and the day grid is recomputed for whichever
 * year/month is currently selected via `daysInJalaliMonth`, so Esfand
 * correctly shows 29 or 30 days depending on leap year.
 */
export function JalaliCalendarPicker({ value, onSelect }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const today = todayJalali()
  const [viewYear, setViewYear] = useState(value?.year ?? today.year)
  const [viewMonth, setViewMonth] = useState(value?.month ?? today.month)

  const dayCount = daysInJalaliMonth(viewYear, viewMonth)
  const days = Array.from({ length: dayCount }, (_, index) => index + 1)

  function changeMonth(delta: number): void {
    let nextMonth = viewMonth + delta
    let nextYear = viewYear
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    } else if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    }
    setViewMonth(nextMonth)
    setViewYear(nextYear)
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="سال قبل"
            onPress={() => setViewYear((current) => current - 1)}
            style={styles.stepperButton}
            hitSlop={theme.spacing.space2}
          >
            <Text style={[theme.typography('titleMd'), styles.stepperSymbol]}>−</Text>
          </Pressable>
          <Text style={[theme.typography('titleMd'), styles.stepperValue]}>{viewYear}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="سال بعد"
            onPress={() => setViewYear((current) => current + 1)}
            style={styles.stepperButton}
            hitSlop={theme.spacing.space2}
          >
            <Text style={[theme.typography('titleMd'), styles.stepperSymbol]}>+</Text>
          </Pressable>
        </View>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ماه قبل"
            onPress={() => changeMonth(-1)}
            style={styles.stepperButton}
            hitSlop={theme.spacing.space2}
          >
            <Text style={[theme.typography('titleMd'), styles.stepperSymbol]}>−</Text>
          </Pressable>
          <Text style={[theme.typography('titleMd'), styles.stepperValue]}>
            {jalaliMonthName(viewMonth)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ماه بعد"
            onPress={() => changeMonth(1)}
            style={styles.stepperButton}
            hitSlop={theme.spacing.space2}
          >
            <Text style={[theme.typography('titleMd'), styles.stepperSymbol]}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const isSelected =
            value?.year === viewYear && value.month === viewMonth && value.day === day
          const isToday = today.year === viewYear && today.month === viewMonth && today.day === day
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${day} ${jalaliMonthName(viewMonth)} ${viewYear}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect({ year: viewYear, month: viewMonth, day })}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday
              ]}
            >
              <Text
                style={[
                  theme.typography('bodyMd'),
                  isSelected ? styles.dayTextSelected : styles.dayText
                ]}
              >
                {day}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.space4
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.space4
    },
    stepper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      paddingHorizontal: theme.spacing.space2
    },
    stepperButton: {
      width: theme.touchTargetMinimum,
      height: theme.touchTargetMinimum,
      alignItems: 'center',
      justifyContent: 'center'
    },
    stepperSymbol: {
      color: theme.colors.primary
    },
    stepperValue: {
      color: theme.colors.onSurface
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.space2
    },
    dayCell: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center'
    },
    dayCellSelected: {
      backgroundColor: theme.colors.primary
    },
    dayCellToday: {
      borderWidth: 1,
      borderColor: theme.colors.primary
    },
    dayText: {
      color: theme.colors.onSurface
    },
    dayTextSelected: {
      color: theme.colors.onPrimary
    }
  })
}
