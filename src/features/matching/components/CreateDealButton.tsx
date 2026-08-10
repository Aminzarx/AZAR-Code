import React, { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'
import { Button } from '@shared/components'
import { useDealService } from '@features/deal/hooks/useDealService'

type Props = {
  userId: string
  propertyId: string
  applicantId: string
  onCreated: (dealId: string) => void
}

/** The "ایجاد پیگیری" action requested on each match card — creates a Deal (status "new") and hands off to the caller. */
export function CreateDealButton({
  userId,
  propertyId,
  applicantId,
  onCreated
}: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const service = useDealService()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePress(): Promise<void> {
    if (!service) {
      return
    }
    setError(null)
    setIsCreating(true)
    try {
      const deal = await service.createDeal(userId, propertyId, applicantId)
      onCreated(deal.id)
    } catch {
      setError('ایجاد پیگیری با مشکل مواجه شد. دوباره تلاش کنید.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Button
        label="ایجاد پیگیری"
        onPress={handlePress}
        variant="text"
        fullWidth={false}
        loading={isCreating}
        style={styles.button}
      />
      {error ? <Text style={[theme.typography('bodySm'), styles.error]}>{error}</Text> : null}
    </>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      marginTop: theme.spacing.space2
    },
    // design-system.md §10 — a short Text in a column container doesn't
    // reliably stretch to full width, so textAlign alone isn't enough;
    // alignSelf explicitly anchors it to the correct edge.
    error: {
      color: theme.colors.error,
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start'
    }
  })
}
