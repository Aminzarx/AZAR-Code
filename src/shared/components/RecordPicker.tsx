import React, { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { searchTerms } from '@shared/utils/persianText'
import { Icon } from './Icon'

export type RecordOption = { id: string; title: string; subtitle?: string }

type Props = {
  label: string
  placeholder: string
  options: readonly RecordOption[]
  value: string | null
  onChange: (id: string) => void
  required?: boolean
  errorMessage?: string
  /** shown in the list when there is nothing to pick yet */
  emptyText: string
}

/**
 * Amin #5408: picks one saved record (a file, an applicant) for a form: a field that opens a searchable list.
 * Every typed word must appear in the record's title or subtitle.
 */
export function RecordPicker({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  errorMessage,
  emptyText
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.id === value) ?? null
  const shown = useMemo(() => {
    const terms = searchTerms(query)
    if (terms.length === 0) return options
    return options.filter((option) => {
      const text = `${option.title} ${option.subtitle ?? ''}`
      return terms.every((term) => text.includes(term))
    })
  }, [options, query])

  return (
    <View style={styles.group}>
      <Text style={[theme.typography('labelMd'), styles.label]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          setQuery('')
          setOpen(true)
        }}
        style={[styles.field, errorMessage ? styles.fieldError : null]}
      >
        <Text
          numberOfLines={1}
          style={[theme.typography('bodyMd'), styles.fieldText, !selected && styles.placeholder]}
        >
          {selected ? [selected.title, selected.subtitle].filter(Boolean).join(' · ') : placeholder}
        </Text>
        <Icon name="search" size="sm" color={theme.colors.onSurfaceVariant} />
      </Pressable>
      {errorMessage ? <Text style={[theme.typography('bodySm'), styles.error]}>{errorMessage}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={[theme.typography('titleMd'), styles.label]}>{label}</Text>
            <RNTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="جست‌وجو…"
              placeholderTextColor={theme.colors.placeholder}
              accessibilityLabel={`جست‌وجو در ${label}`}
              style={[theme.typography('bodyMd'), styles.search]}
              textAlign={theme.isRTL ? 'right' : 'left'} // rtl-allow: TextInput: Android does not swap, so right is physical right
              autoFocus
            />
            <FlatList
              data={shown}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                <Text style={[theme.typography('bodyMd'), styles.empty]}>
                  {options.length === 0 ? emptyText : 'موردی یافت نشد'}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  accessibilityState={{ selected: item.id === value }}
                  onPress={() => {
                    onChange(item.id)
                    setOpen(false)
                  }}
                  style={[styles.row, item.id === value && styles.rowSelected]}
                >
                  <Text numberOfLines={1} style={[theme.typography('bodyLg'), styles.rowTitle]}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text numberOfLines={1} style={[theme.typography('bodySm'), styles.rowSubtitle]}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    group: { gap: theme.spacing.space2 },
    label: { color: theme.colors.onSurface, alignSelf: start },
    required: { color: theme.colors.error },
    error: { color: theme.colors.error, alignSelf: start },
    field: {
      minHeight: theme.touchTargetMinimum,
      borderRadius: theme.component.textField.radius,
      paddingHorizontal: theme.component.textField.paddingX,
      backgroundColor: theme.colors.field,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space2
    },
    fieldError: { borderColor: theme.colors.error },
    fieldText: { flex: 1, color: theme.colors.onSurface },
    placeholder: { color: theme.colors.placeholder },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      justifyContent: 'center',
      padding: theme.spacing.space5
    },
    sheet: {
      maxHeight: '80%',
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.space5,
      gap: theme.spacing.space3
    },
    search: {
      minHeight: theme.touchTargetMinimum,
      borderRadius: theme.component.textField.radius,
      paddingHorizontal: theme.component.textField.paddingX,
      backgroundColor: theme.colors.field,
      color: theme.colors.onSurface
    },
    list: { flexGrow: 0 },
    empty: { color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: theme.spacing.space5 },
    row: {
      paddingVertical: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space3,
      borderRadius: theme.radius.medium,
      gap: 2
    },
    rowSelected: { backgroundColor: theme.colors.primaryContainer },
    rowTitle: { color: theme.colors.onSurface, alignSelf: start },
    rowSubtitle: { color: theme.colors.onSurfaceVariant, alignSelf: start }
  })
}
