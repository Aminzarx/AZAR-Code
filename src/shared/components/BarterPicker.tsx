import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useTheme, type Theme } from '@shared/theme'
import { BARTER_ITEM_OPTIONS } from '@shared/data/realEstateOptions'
import { Checkbox } from './Checkbox'
import { TextInput } from './TextInput'

type Props = {
  items: readonly string[]
  other: string
  onItemsChange: (items: string[]) => void
  onOtherChange: (text: string) => void
  itemsError?: string
  otherError?: string
}

/**
 * Amin #5408: what is offered in a barter, the same set as on a barter file (طلا/خودرو/زمین/ملک) plus a free-text
 * «سایر»; used on the applicant's «چه می‌خواهد» step.
 */
export function BarterPicker({ items, other, onItemsChange, onOtherChange, itemsError, otherError }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  function toggle(item: string, checked: boolean): void {
    onItemsChange(checked ? [...items, item] : items.filter((existing) => existing !== item))
    if (item === 'سایر' && !checked) onOtherChange('')
  }

  return (
    <View style={styles.section}>
      <Text style={[theme.typography('labelMd'), styles.label]}>
        مورد تهاتر<Text style={styles.required}> *</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {BARTER_ITEM_OPTIONS.map((item) => (
          <Checkbox key={item} label={item} value={items.includes(item)} onChange={(checked) => toggle(item, checked)} />
        ))}
      </ScrollView>
      {itemsError ? <Text style={[theme.typography('bodySm'), styles.error]}>{itemsError}</Text> : null}
      {items.includes('سایر') ? (
        <TextInput
          label="توضیح مورد تهاتر"
          multiline
          required
          value={other}
          onChangeText={onOtherChange}
          placeholder="مثلاً لوازم منزل، طرح تجاری..."
          errorMessage={otherError}
        />
      ) : null}
    </View>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    section: { gap: theme.spacing.space3 },
    label: { color: theme.colors.onSurface, alignSelf: start },
    required: { color: theme.colors.error },
    error: { color: theme.colors.error, alignSelf: start },
    row: { flexDirection: 'row', gap: theme.spacing.space4 }
  })
}
