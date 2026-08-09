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

const LENGTH = 6

type Status = 'default' | 'error' | 'success'

type Props = {
  value: string
  onChangeValue: (value: string) => void
  status?: Status
  disabled?: boolean
  /** Fires once the left-to-right success sweep (see design-system.md) finishes. */
  onSuccessAnimationComplete?: () => void
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
  onSuccessAnimationComplete
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const inputRefs = useRef<Array<RNTextInput | null>>([])
  const successAnim = useMemo(() => Array.from({ length: LENGTH }, () => new Animated.Value(0)), [])

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')

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
      const pasted = text.replace(/\D/g, '').slice(0, LENGTH - index)
      const next = digits.slice()
      for (let i = 0; i < pasted.length; i++) {
        next[index + i] = pasted[i] ?? ''
      }
      onChangeValue(next.join('').slice(0, LENGTH))
      const lastFilled = Math.min(index + pasted.length, LENGTH - 1)
      inputRefs.current[lastFilled]?.focus()
      return
    }

    const digit = text.replace(/\D/g, '')
    setDigitAt(index, digit)
    if (digit && index < LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyPress(
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>
  ): void {
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
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
            : theme.colors.outlineVariant

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
          value={digit}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(event) => handleKeyPress(index, event)}
          keyboardType="number-pad"
          maxLength={index === 0 ? LENGTH : 1}
          editable={!disabled}
          textAlign="center"
          selectionColor={theme.colors.primary}
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
