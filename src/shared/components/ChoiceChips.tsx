import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { TextInput } from './TextInput'

type Props = {
  label: string
  options: readonly string[]
  /** Free text: a value outside `options` (typed under «سایر») still shows as selected. */
  value: string
  onChange: (value: string) => void
  required?: boolean
  errorMessage?: string
  /** Show a «سایر» chip that opens a text field for a value not in the list. */
  allowOther?: boolean
}

const OTHER = 'سایر'

/**
 * v3.0.0 (Amin #4180/#4211): one-tap choice for a form field (deal type,
 * property type) instead of typing it. Selected chip = brand navy fill,
 * as on kssx.ir. The stored value stays the same free text as before.
 */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  required,
  errorMessage,
  allowOther
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const trimmed = value.trim()
  const isCustom = trimmed !== '' && !options.includes(trimmed)
  const [otherOpen, setOtherOpen] = useState(isCustom)

  function chip(
    key: string,
    text: string,
    selected: boolean,
    onPress: () => void
  ): React.JSX.Element {
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[theme.typography('labelMd'), selected ? styles.textSelected : styles.text]}>
          {text}
        </Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.row}>
        {options.map((option) =>
          chip(option, option, !otherOpen && trimmed === option, () => {
            setOtherOpen(false)
            onChange(trimmed === option ? '' : option)
          })
        )}
        {allowOther
          ? chip(OTHER, OTHER, otherOpen, () => {
              const next = !otherOpen
              setOtherOpen(next)
              onChange(next ? (isCustom ? trimmed : '') : '')
            })
          : null}
      </View>
      {otherOpen ? (
        <TextInput
          label={`${label} (دیگر)`}
          value={isCustom ? value : ''}
          onChangeText={onChange}
          autoFocus
        />
      ) : null}
      {errorMessage ? (
        <Text style={[theme.typography('bodySm'), styles.error]}>{errorMessage}</Text>
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    group: {
      gap: theme.spacing.space2
    },
    label: {
      color: theme.colors.onSurface,
      alignSelf: start
    },
    required: {
      color: theme.colors.error
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.space2
    },
    chip: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.space4,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center'
    },
    chipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
    },
    text: {
      color: theme.colors.onSurface
    },
    textSelected: {
      color: theme.colors.onPrimary
    },
    error: {
      color: theme.colors.error,
      alignSelf: start
    }
  })
}
