import React from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator } from '@shared/components'
import { useContracts } from '../hooks/useContracts'
import { ContractListItem } from '../components/ContractListItem'

type Props = NativeStackScreenProps<MainStackParamList, 'ContractList'>

export function ContractListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const { contracts, isLoading, error, refetch } = useContracts(userId)

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
              title="بارگذاری قراردادها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : contracts && contracts.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز قراردادی ثبت نشده"
              description="قراردادها را از صفحه پیگیری ایجاد کنید."
            />
          </View>
        ) : (
          <FlatList
            data={contracts ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ContractListItem
                contract={item}
                onPress={() => navigation.navigate('ContractDetail', { contractId: item.id })}
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
