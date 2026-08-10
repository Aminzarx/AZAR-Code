import React, { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator, TextInput } from '@shared/components'
import { useApplicants } from '../hooks/useApplicants'
import { ApplicantListItem } from '../components/ApplicantListItem'

type Props = NativeStackScreenProps<MainStackParamList, 'ApplicantList'>

export function ApplicantListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const userId = session?.userId ?? ''
  const [search, setSearch] = useState('')
  const { applicants, isLoading, error, refetch } = useApplicants(userId, search)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <TextInput
          label="جستجو"
          value={search}
          onChangeText={setSearch}
          placeholder="نام، شهر یا شماره تماس"
        />

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری متقاضیان با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : applicants && applicants.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز متقاضی‌ای ثبت نشده"
              description="با افزودن اولین متقاضی، اینجا نمایش داده می‌شود."
              actionLabel="افزودن متقاضی"
              onAction={() => navigation.navigate('CreateApplicant')}
            />
          </View>
        ) : (
          <FlatList
            data={applicants ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ApplicantListItem
                applicant={item}
                onPress={() => navigation.navigate('ApplicantDetail', { applicantId: item.id })}
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
