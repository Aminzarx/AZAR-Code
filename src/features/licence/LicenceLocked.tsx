import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native'
import { useTheme, type Theme } from '@shared/theme'
import { BackButton, EmptyState, Icon } from '@shared/components'
import { useLicence } from '@shared/licence/LicenceContext'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'

/**
 * Amin #4906: what a closed section shows after the licence ended — never a locked app. The user's files are
 * still there to read; this says so and leads to the renewal in «تنظیمات».
 */
export function LicenceLocked({ section }: { section: string }): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const canGoBack = typeof navigation.canGoBack === 'function' && navigation.canGoBack()
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {canGoBack ? (
        <View style={styles.top}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
      ) : null}
      <View style={styles.body}>
        <EmptyState
          icon={<Icon name="lock" size="lg" color={theme.colors.primary} />}
          title="اشتراک ایوان تمام شده است"
          description={`پرونده‌هایتان سر جایشان است و می‌توانید آن‌ها را ببینید. ${section} پس از تمدید اشتراک دوباره باز می‌شود.`}
          actionLabel="تمدید اشتراک"
          onAction={() => navigateAcrossTabs(navigation, 'Settings', undefined)}
        />
      </View>
    </SafeAreaView>
  )
}

/** The screen as it is while the licence is open; the closed panel after it ended. */
export function withLicence<P extends object>(
  Screen: React.ComponentType<P>,
  section: string
): React.ComponentType<P> {
  function Licensed(props: P): React.JSX.Element {
    const { canEdit } = useLicence()
    return canEdit ? <Screen {...props} /> : <LicenceLocked section={section} />
  }
  Licensed.displayName = `withLicence(${Screen.displayName ?? Screen.name ?? 'Screen'})`
  return Licensed
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    top: { paddingHorizontal: theme.layout.screenPaddingX, paddingTop: theme.spacing.space2 },
    body: { flex: 1, justifyContent: 'center', paddingHorizontal: theme.layout.screenPaddingX }
  })
}
