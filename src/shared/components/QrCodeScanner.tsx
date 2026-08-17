import React, { useEffect, useState } from 'react'
import { Modal, PermissionsAndroid, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Camera } from 'react-native-camera-kit'
import { useTheme, type Theme } from '@shared/theme'
import { Icon } from './Icon'
import { LoadingIndicator } from './LoadingIndicator'
import { ErrorState } from './ErrorState'

type Props = {
  visible: boolean
  title: string
  onScan: (value: string) => void
  onClose: () => void
}

type PermissionState = 'checking' | 'granted' | 'denied'

/**
 * design-system.md — full-screen camera modal for scanning a QR code
 * (currently: a referral code on `ReferralCodeScreen`). Requests Android's
 * CAMERA permission on open, never assumes it's already granted. The
 * scanned string is handed back as-is via `onScan`; validating it against
 * anything (a referral code existing in the database, say) is the
 * caller's responsibility — this component only reads the code.
 */
export function QrCodeScanner({ visible, title, onScan, onClose }: Props): React.JSX.Element {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [permission, setPermission] = useState<PermissionState>('checking')

  useEffect(() => {
    if (!visible) {
      return
    }
    setPermission('checking')
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'دسترسی دوربین',
      message: 'برای اسکن بارکد، آزار به دوربین دستگاه شما نیاز دارد.',
      buttonPositive: 'اجازه می‌دهم',
      buttonNegative: 'انصراف'
    })
      .then((result) => {
        setPermission(result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied')
      })
      .catch(() => setPermission('denied'))
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[theme.typography('titleMd'), styles.title]}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بستن"
            onPress={onClose}
            hitSlop={theme.spacing.space2}
          >
            <Icon name="close" size="sm" color={theme.colors.onSurface} />
          </Pressable>
        </View>

        {permission === 'checking' ? (
          <View style={styles.centered}>
            <LoadingIndicator size="large" />
          </View>
        ) : permission === 'denied' ? (
          <View style={styles.centered}>
            <ErrorState
              title="دسترسی دوربین داده نشد"
              description="برای اسکن بارکد، دسترسی دوربین را از تنظیمات دستگاه فعال کنید."
            />
          </View>
        ) : (
          <Camera
            style={styles.camera}
            scanBarcode
            showFrame
            laserColor={theme.colors.secondary}
            frameColor={theme.colors.secondary}
            onReadCode={(event) => onScan(event.nativeEvent.codeStringValue)}
          />
        )}
      </SafeAreaView>
    </Modal>
  )
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.primary
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.layout.screenPaddingX,
      paddingVertical: theme.spacing.space4
    },
    title: {
      color: theme.colors.onPrimary
    },
    camera: {
      flex: 1
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.layout.screenPaddingX
    }
  })
}
