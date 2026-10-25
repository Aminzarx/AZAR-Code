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

type MultiProps = {
  label: string
  options: readonly string[]
  values: readonly string[]
  onChange: (values: string[]) => void
  required?: boolean
  errorMessage?: string
  helperText?: string
}

/** Amin #5240: the same chips, several may be on (a file for sale and for رهن و اجاره at once). */
export function MultiChoiceChips({
  label,
  options,
  values,
  onChange,
  required,
  errorMessage,
  helperText
}: MultiProps): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <Pressable
              key={option}
              accessibilityRole="checkbox"
              accessibilityLabel={option}
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange(selected ? values.filter((v) => v !== option) : options.filter((o) => o === option || values.includes(o)))
              }
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[theme.typography('labelMd'), selected ? styles.textSelected : styles.text]}>{option}</Text>
            </Pressable>
          )
        })}
      </View>
      {errorMessage ? (
        <Text style={[theme.typography('bodySm'), styles.error]}>{errorMessage}</Text>
      ) : helperText ? (
        <Text style={[theme.typography('bodySm'), styles.helper]}>{helperText}</Text>
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
      backgroundColor: theme.colors.field,
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
    },
    helper: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: start
    }
  })
}
