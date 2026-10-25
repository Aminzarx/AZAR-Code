import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import {
  PALETTE_LABELS,
  PALETTE_NAMES,
  PALETTE_SWATCH,
  isDarkOnly,
  useAppearance,
  useTheme,
  type AppearanceMode,
  type Theme
} from '@shared/theme'
import { FormScreenContainer, Icon, SegmentedControl } from '@shared/components'

type Props = NativeStackScreenProps<MainStackParamList, 'Personalize'>

const APPEARANCE_OPTIONS: readonly { value: AppearanceMode; label: string }[] = [
  { value: 'light', label: 'روشن' },
  { value: 'dark', label: 'تیره' },
  { value: 'system', label: 'هماهنگ با گوشی' }
]

/** Amin #5298/#5308: «شخصی‌سازی» — the app's colour (navy, blue, charcoal) and «حالت نمایش» */
export function PersonalizeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const appearance = useAppearance()

  return (
    <FormScreenContainer headerTitle="شخصی‌سازی" onBack={() => navigation.goBack()}>
      <View style={styles.card}>
        <Text style={[theme.typography('titleSm'), styles.title]}>رنگ برنامه</Text>
        <View style={styles.swatches}>
          {PALETTE_NAMES.map((name) => {
            const selected = appearance.palette === name
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`تم ${PALETTE_LABELS[name]}`}
                accessibilityState={{ selected }}
                onPress={() => appearance.setPalette(name)}
                style={styles.swatchItem}
              >
                <View style={[styles.swatchRing, selected && styles.swatchRingOn]}>
                  <View style={[styles.swatch, { backgroundColor: PALETTE_SWATCH[name] }]}>
                    {selected ? <Icon name="check" size="sm" color="#FFFFFF" /> : null}
                  </View>
                </View>
                <Text style={[theme.typography('labelMd'), styles.swatchLabel]}>{PALETTE_LABELS[name]}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.card} accessibilityLabel="حالت نمایش">
        <Text style={[theme.typography('titleSm'), styles.title]}>حالت نمایش</Text>
        {isDarkOnly(appearance.palette) ? (
          <Text style={[theme.typography('bodySm'), styles.note]}>تم ذغال‌سنگی همیشه تیره است.</Text>
        ) : (
          <SegmentedControl options={APPEARANCE_OPTIONS} value={appearance.mode} onChange={appearance.setMode} />
        )}
      </View>
    </FormScreenContainer>
  )
}

function createStyles(theme: Theme) {
  const start = theme.isRTL ? 'flex-start' : 'flex-end'
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.radius.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      padding: theme.spacing.space4,
      gap: theme.spacing.space4,
      marginBottom: theme.spacing.space4
    },
    title: { color: theme.colors.onSurface, alignSelf: start },
    note: { color: theme.colors.onSurfaceVariant, alignSelf: start },
    swatches: { flexDirection: 'row', justifyContent: 'space-around' },
    swatchItem: { alignItems: 'center', gap: theme.spacing.space2, minWidth: 72 },
    swatchRing: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
    swatchRingOn: { borderColor: theme.colors.primary },
    swatch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    swatchLabel: { color: theme.colors.onSurface }
  })
}
