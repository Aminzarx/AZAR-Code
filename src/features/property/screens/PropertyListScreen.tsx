import React, { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@navigation/MainNavigator'
import { useAuth } from '@features/auth/AuthProvider'
import { useTheme, type Theme } from '@shared/theme'
import { EmptyState, ErrorState, LoadingIndicator, TextInput } from '@shared/components'
import { useProperties } from '../hooks/useProperties'
import { PropertyListItem } from '../components/PropertyListItem'

type Props = NativeStackScreenProps<MainStackParamList, 'PropertyList'>

export function PropertyListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const { session } = useAuth()
  const ownerId = session?.userId ?? ''
  const [search, setSearch] = useState('')
  const { properties, isLoading, error, refetch } = useProperties(ownerId, search)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <TextInput
          label="جستجو"
          value={search}
          onChangeText={setSearch}
          placeholder="عنوان، شهر، آدرس یا قیمت"
        />

        {isLoading ? (
          <View style={styles.centeredSection}>
            <LoadingIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centeredSection}>
            <ErrorState
              title="بارگذاری پرونده‌ها با مشکل مواجه شد"
              description={error.message}
              retryLabel="تلاش مجدد"
              onRetry={refetch}
            />
          </View>
        ) : properties && properties.length === 0 ? (
          <View style={styles.centeredSection}>
            <EmptyState
              title="هنوز پرونده‌ای ثبت نشده"
              description="با افزودن اولین پرونده ملکی، اینجا نمایش داده می‌شود."
              actionLabel="افزودن پرونده ملکی"
              onAction={() => navigation.navigate('CreateProperty')}
            />
          </View>
        ) : (
          <FlatList
            data={properties ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <PropertyListItem
                property={item}
                onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
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
