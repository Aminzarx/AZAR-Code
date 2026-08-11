import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button, Card, EmptyState, TextInput } from '@shared/components'

type Props = {
  notes: string | null
  isSaving: boolean
  onSave: (notes: string) => void
}

/**
 * design-system.md §17.2 Deal Detail's Notes section. `DealRecord.notes`
 * is a single free-text field, not a list, so "افزودن یادداشت" edits/
 * replaces that one field — no invented notes-list feature. No dedicated
 * bottom-sheet primitive fits a single-field capture well (`FilterSheet`'s
 * apply/clear labels don't match this flow), so this is a minimal
 * purpose-built `Modal`, same "glass" presentation language as
 * `ConfirmDialog`/`FilterSheet`.
 */
export function DealNotesSection({ notes, isSaving, onSave }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function openEditor(): void {
    setDraft(notes ?? '')
    setIsEditing(true)
  }

  function handleSave(): void {
    onSave(draft)
    setIsEditing(false)
  }

  return (
    <View style={styles.section}>
      <Text style={[theme.typography('titleMd'), styles.heading]}>یادداشت‌ها</Text>

      {notes ? (
        <Card>
          <Text style={[theme.typography('bodyMd'), styles.noteText]}>{notes}</Text>
          <Button
            label="ویرایش یادداشت"
            variant="text"
            onPress={openEditor}
            fullWidth={false}
            style={styles.editButton}
          />
        </Card>
      ) : (
        <EmptyState
          compact
          title="هنوز یادداشتی ثبت نشده"
          description="یادداشت‌های این معامله اینجا نمایش داده می‌شود."
          actionLabel="افزودن یادداشت"
          onAction={openEditor}
        />
      )}

      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsEditing(false)}
          accessibilityRole="button"
          accessibilityLabel="بستن"
        >
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <Text style={[theme.typography('titleMd'), styles.dialogTitle]}>یادداشت</Text>
            <TextInput
              label="یادداشت"
              value={draft}
              onChangeText={setDraft}
              placeholder="یادداشت این معامله"
            />
            <View style={styles.dialogActions}>
              <Button
                label="انصراف"
                variant="secondary"
                onPress={() => setIsEditing(false)}
                disabled={isSaving}
                style={styles.dialogAction}
              />
              <Button
                label="ذخیره"
                onPress={handleSave}
                loading={isSaving}
                style={styles.dialogAction}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing.space3
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    heading: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    noteText: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    editButton: {
      marginTop: theme.spacing.space2,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 32, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    },
    dialog: {
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
    dialogTitle: {
      color: theme.colors.onSurface,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    dialogActions: {
      flexDirection: 'row',
      gap: theme.spacing.space3,
      marginTop: theme.spacing.space2
    },
    dialogAction: {
      flex: 1
    }
  })
}
