import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from './Button'
import { Icon } from './Icon'

type Props = {
  visible: boolean
  title: string
  children: React.ReactNode
  /** Whether any filter is currently applied — enables the "clear" action. */
  hasActiveFilters: boolean
  onApply: () => void
  onClear: () => void
  onClose: () => void
  /** v1.3.0: the apply button says what it will show, e.g. «نمایش ۱۲ فایل». */
  applyLabel?: string
}

/**
 * Amin #5557: advanced search is a page of its own (full screen, slides in), not a sheet over the list — the sheet
 * caught the finger and its body would not scroll. Title and × at the top, the filter groups scroll in between, «پاک
 * کردن همه» and the apply button stay at the bottom where the thumb is (#5067). Android back closes it.
 */
export function FilterSheet({
  visible,
  title,
  children,
  hasActiveFilters,
  onApply,
  onClear,
  onClose,
  applyLabel = 'اعمال فیلتر'
}: Props): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme, insets)

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" statusBarTranslucent>
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بستن فیلترها"
            onPress={onClose}
            hitSlop={theme.spacing.space2}
            style={styles.close}
          >
            <Icon name="close" size="sm" color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {React.Children.toArray(children)
            .filter(Boolean)
            .map((child, index) => (
              <View key={index} style={[styles.group, index > 0 && styles.groupDivided]}>
                {child}
              </View>
            ))}
        </ScrollView>
        <View style={styles.actions}>
          <Button
            label="پاک کردن همه"
            variant="secondary"
            onPress={onClear}
            disabled={!hasActiveFilters}
            style={styles.clearAction}
          />
          <Button label={applyLabel} onPress={onApply} style={styles.action} />
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: Theme, insets: EdgeInsets) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: insets.top + theme.spacing.space3,
      paddingBottom: theme.spacing.space4 + insets.bottom
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.space6,
      paddingBottom: theme.spacing.space3,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant
    },
    close: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceContainer
    },
    title: {
      color: theme.colors.onSurface,
      flexShrink: 1
    },
    body: {
      flex: 1
    },
    bodyContent: {
      paddingHorizontal: theme.spacing.space6,
      paddingBottom: theme.spacing.space6
    },
    group: {
      paddingVertical: theme.spacing.space4
    },
    groupDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      paddingHorizontal: theme.spacing.space6,
      paddingTop: theme.spacing.space4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant
    },
    action: {
      flex: 2
    },
    clearAction: {
      flex: 1
    }
  })
}
