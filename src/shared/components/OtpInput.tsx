import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData
} from 'react-native'
import { useTheme, type Theme } from '../theme'
import { toPersianDigits } from '../utils/persianText'

const LENGTH = 6

type Status = 'default' | 'error' | 'success'

type Props = {
  value: string
  onChangeValue: (value: string) => void
  status?: Status
  disabled?: boolean
  /** Fires once the left-to-right success sweep (see design-system.md) finishes. */
  onSuccessAnimationComplete?: () => void
  /** v3.0.0: focus the first box as soon as the boxes appear. */
  autoFocus?: boolean
}

/** v3.0.0: Persian/Arabic-Indic digits from a Persian keyboard count as digits too. */
function toLatinDigits(text: string): string {
  return text
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

/**
 * 6-box OTP entry. Digit order is always left-to-right regardless of
 * RTL — OTP codes are Western numerals read the same direction as the
 * SMS that contains them; mirroring the boxes for RTL would break that,
 * which is exactly what the design brief calls out ("visual box order
 * must stay consistent with OTP logic"). Achieved by rendering the
 * boxes pre-reversed when isRTL, so RN's automatic RTL row-mirroring
 * cancels back out to a strict left-to-right digit[0..5] layout.
 */
export function OtpInput({
  value,
  onChangeValue,
  status = 'default',
  disabled,
  onSuccessAnimationComplete,
  autoFocus
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const inputRefs = useRef<Array<RNTextInput | null>>([])
  const successAnim = useMemo(() => Array.from({ length: LENGTH }, () => new Animated.Value(0)), [])

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')
  const firstEmpty = digits.findIndex((d) => !d)
  const nextIndex = firstEmpty === -1 ? LENGTH - 1 : firstEmpty

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[nextIndex]?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  // v3.0.0 (emulator review 2026-10-22): a tap on any later box (in RTL the
  // right-hand ones, where a Persian reader taps first) used to put the cursor
  // there while digits filled from the left. Focus always goes to the next
  // box to fill, so typing and the cursor stay in one place.
  function handleFocus(index: number): void {
    if (index > nextIndex) {
      inputRefs.current[nextIndex]?.focus()
    }
  }

  useEffect(() => {
    if (status !== 'success') {
      successAnim.forEach((anim) => anim.setValue(0))
      return
    }
    const animation = Animated.stagger(
      80,
      successAnim.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false })
      )
    )
    animation.start(({ finished }) => {
      if (finished) {
        onSuccessAnimationComplete?.()
      }
    })
    return () => animation.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  function setDigitAt(index: number, char: string): void {
    const next = digits.slice()
    next[index] = char
    onChangeValue(next.join('').slice(0, LENGTH))
  }

  function handleChangeText(index: number, text: string): void {
    if (text.length > 1) {
      // Pasted content — distribute from this box onward.
      const pasted = toLatinDigits(text)
        .replace(/\D/g, '')
        .slice(0, LENGTH - index)
      const next = digits.slice()
      for (let i = 0; i < pasted.length; i++) {
        next[index + i] = pasted[i] ?? ''
      }
      onChangeValue(next.join('').slice(0, LENGTH))
      const lastFilled = Math.min(index + pasted.length, LENGTH - 1)
      inputRefs.current[lastFilled]?.focus()
      return
    }

    const digit = toLatinDigits(text).replace(/\D/g, '')
    setDigitAt(index, digit)
    if (digit && index < LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyPress(
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>
  ): void {
    if (event.nativeEvent.key !== 'Backspace') {
      return
    }
    if (digits[index]) {
      // Deleting must work from any box, not just the last one — handled
      // explicitly here (not left to onChangeText) because a maxLength=1
      // RNTextInput on Android doesn't reliably fire onChangeText for a
      // backspace on an already-full box once the cursor sits before its
      // one character, which otherwise silently made a box's digit
      // un-deletable unless the user first backed all the way into it
      // from the end.
      setDigitAt(index, '')
      return
    }
    if (index > 0) {
      inputRefs.current[index - 1]?.focus()
      setDigitAt(index - 1, '')
    }
  }

  const boxes = digits.map((digit, index) => {
    const borderColor =
      status === 'success'
        ? successAnim[index]?.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.colors.outlineVariant, theme.colors.success]
          })
        : status === 'error'
          ? theme.colors.error
          : digit
            ? theme.colors.primary
            : theme.colors.outline

    return (
      <Animated.View
        key={index}
        style={[
          styles.box,
          {
            borderColor,
            borderWidth: status === 'error' ? 2 : 1
          }
        ]}
      >
        <RNTextInput
          ref={(ref) => {
            inputRefs.current[index] = ref
          }}
          accessibilityLabel={`رقم ${index + 1} کد تأیید`}
          style={[theme.typography('headlineMd'), styles.digitText]}
          // v1.4.0 (Amin): the boxes show Persian digits; the code itself stays Latin
          value={toPersianDigits(digit)}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(event) => handleKeyPress(index, event)}
          onFocus={() => handleFocus(index)}
          keyboardType="number-pad"
          maxLength={index === 0 ? LENGTH : 1}
          // v1.2.0 (Amin #4229): lets the keyboard offer the code from the SMS; the first box takes all six.
          autoComplete={index === 0 ? 'sms-otp' : 'off'}
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          editable={!disabled}
          textAlign="center"
          selectionColor={theme.colors.primary}
          selectTextOnFocus
        />
      </Animated.View>
    )
  })

  return <View style={styles.row}>{theme.isRTL ? boxes.reverse() : boxes}</View>
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.space2
    },
    box: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: theme.radius.large,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceContainerLowest
    },
    digitText: {
      color: theme.colors.primary,
      width: '100%',
      padding: 0
    }
  })
}
