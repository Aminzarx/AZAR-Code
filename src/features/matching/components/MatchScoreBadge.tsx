import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '@shared/theme'

type Props = {
  score: number
}

export function MatchScoreBadge({ score }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.badge}>
      <Text style={[theme.typography('labelSm'), styles.text]}>{score}٪ تطابق</Text>
    </View>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    badge: {
      alignSelf: theme.isRTL ? 'flex-end' : 'flex-start',
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.space1,
      paddingHorizontal: theme.spacing.space3
    },
    text: {
      color: theme.colors.onSecondaryContainer
    }
  })
}
