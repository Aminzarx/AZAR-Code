import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Icon, type IconName } from '@shared/components'

export type SheetOption = {
  icon: IconName
  label: string
  description?: string
  /** brand colour for the icon tile (messengers) */
  tint?: string
  disabled?: boolean
  onPress: () => void
}

type Props = {
  visible: boolean
  title: string
  lead?: string
  options: SheetOption[]
  onClose: () => void
}

/** v1.5.0 (Amin #4632): a bottom sheet of a few choices — backup, support. */
export function OptionsSheet({ visible, title, lead, options, onClose }: Props): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme, insets.bottom)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن">
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          {lead ? <Text style={[theme.typography('bodySm'), styles.lead]}>{lead}</Text> : null}
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ disabled: !!option.disabled }}
                disabled={option.disabled}
                onPress={option.onPress}
                style={({ pressed }) => [styles.option, pressed && styles.pressed, option.disabled && styles.disabled]}
              >
                <View style={[styles.iconTile, option.tint ? { backgroundColor: option.tint } : null]}>
                  <Icon
                    name={option.icon}
                    size="sm"
                    color={option.tint ? '#FFFFFF' : theme.colors.primary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={[theme.typography('bodyLg'), styles.optionLabel]}>{option.label}</Text>
                  {option.description ? (
                    <Text style={[theme.typography('bodySm'), styles.optionDescription]}>{option.description}</Text>
                  ) : null}
                </View>
                {!option.disabled ? <Icon name="chevron" size="xs" color={theme.colors.outline} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme, bottomInset: number) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
    sheet: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderTopLeftRadius: theme.radius.extraLarge,
      borderTopRightRadius: theme.radius.extraLarge,
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingTop: theme.spacing.space3,
      paddingBottom: theme.spacing.space6 + bottomInset,
      gap: theme.spacing.space2
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outlineVariant,
      marginBottom: theme.spacing.space2
    },
    title: { color: theme.colors.onSurface },
    lead: { color: theme.colors.onSurfaceVariant },
    options: { marginTop: theme.spacing.space2, gap: theme.spacing.space2 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.space3,
      padding: theme.spacing.space3,
      borderRadius: theme.radius.large,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      minHeight: 64
    },
    pressed: { backgroundColor: theme.colors.surfaceContainerLow },
    disabled: { opacity: 0.55 },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    optionText: { flex: 1, gap: 2, alignItems: theme.isRTL ? 'flex-start' : 'flex-end' },
    optionLabel: { color: theme.colors.onSurface },
    optionDescription: { color: theme.colors.onSurfaceVariant }
  })
}
