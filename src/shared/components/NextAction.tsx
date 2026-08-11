import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Card } from './Card'
import { Button } from './Button'

type Props = {
  title: string
  timestamp: string
  actionLabel: string
  onAction: () => void
  isOverdue?: boolean
}

/**
 * design-system.md §8 Next Action (v2.6.0) — the single most important
 * block on a Deal Detail screen (and reusable wherever a record has one
 * clear next step: an applicant's next follow-up, etc.). Never fabricate
 * a next action when none exists — the caller only renders this when a
 * real upcoming/overdue reminder is present.
 */
export function NextAction({
  title,
  timestamp,
  actionLabel,
  onAction,
  isOverdue = false
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme, isOverdue)

  return (
    <Card variant="detail" style={styles.card}>
      <Text style={[theme.typography('labelMd'), styles.eyebrow]}>قدم بعدی</Text>
      <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
      <Text style={[theme.typography('bodySm'), styles.timestamp]}>{timestamp}</Text>
      <Button label={actionLabel} onPress={onAction} style={styles.action} />
    </Card>
  )
}

function createStyles(theme: Theme, isOverdue: boolean) {
  return StyleSheet.create({
    card: {
      borderWidth: isOverdue ? 1 : 0,
      borderColor: isOverdue ? theme.colors.warning : 'transparent'
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    eyebrow: {
      color: isOverdue ? theme.colors.warning : theme.colors.secondary,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    title: {
      color: theme.colors.onSurface,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    timestamp: {
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.space1,
      alignSelf: theme.isRTL ? 'flex-start' : 'flex-end'
    },
    action: {
      marginTop: theme.spacing.space4
    }
  })
}
