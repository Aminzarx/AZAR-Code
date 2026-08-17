import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, ChipGroup } from '@shared/components'
import type { LostReasonRecord } from '@infrastructure/database/repositories/LostReasonRepository'

type Props = {
  visible: boolean
  reasons: readonly LostReasonRecord[]
  isConfirming?: boolean
  onConfirm: (reasonId: string) => void
  onCancel: () => void
}

/**
 * BR-004 — a deal cannot become 'lost' without a lost reason, so this is
 * the one dialog that gates the "mark as lost" action on DealDetailScreen.
 * Same glass-card shell as ConfirmDialog, with a ChipGroup body for
 * picking one of the seeded lost_reasons instead of a plain description.
 */
export function LostReasonDialog({
  visible,
  reasons,
  isConfirming,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null)

  function handleCancel(): void {
    setSelectedReasonId(null)
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="انصراف"
      >
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={[theme.typography('titleMd'), styles.title]}>دلیل ناموفق‌بودن معامله</Text>
          <Text style={[theme.typography('bodyMd'), styles.description]}>
            برای ثبت این معامله به‌عنوان ناموفق، دلیل آن را انتخاب کنید.
          </Text>
          <ChipGroup
            label="دلیل"
            options={reasons.map((reason) => ({ value: reason.id, label: reason.label }))}
            value={selectedReasonId}
            onChange={setSelectedReasonId}
          />
          <View style={styles.actions}>
            <Button
              label="انصراف"
              variant="secondary"
              onPress={handleCancel}
              disabled={isConfirming}
              style={styles.action}
            />
            <Button
              label="ثبت به‌عنوان ناموفق"
              variant="destructive"
              onPress={() => selectedReasonId && onConfirm(selectedReasonId)}
              disabled={!selectedReasonId}
              loading={isConfirming}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    },
    card: {
      width: '100%',
      maxWidth: 480,
      borderRadius: theme.radius.extraLarge,
      padding: theme.spacing.space6,
      gap: theme.spacing.space3,
      backgroundColor: 'rgba(255, 255, 255, 0.86)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      ...theme.elevation.level4
    },
    title: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space2
    },
    action: {
      flex: 1
    }
  })
}
