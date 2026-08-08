import React from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import { useDeals } from '../hooks/useDeals'
import { DealListItem } from '../components/DealListItem'

type Props = NativeStackScreenProps<MainStackParamList, 'DealList'>

export function DealListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { deals, isLoading, error, refetch } = useDeals(userId)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری پیگیری‌ها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : deals && deals.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز پیگیری‌ای ثبت نشده"
              description="با ایجاد پیگیری از پیشنهادهای تطابق، اینجا نمایش داده می‌شود."
            />
          </View>
        ) : (
          <FlatList
            data={deals ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <DealListItem
                deal={item}
                onPress={() => navigation.navigate('DealDetail', { dealId: item.id })}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    content: {
      flex: 1,
      padding: theme.spacing.space6,
      gap: theme.spacing.space4
    },
    list: {
      gap: theme.spacing.space3
    },
    centeredSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })
}
