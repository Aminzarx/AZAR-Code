import { useEffect } from 'react'
import { Alert } from 'react-native'
import type { NavigationProp } from '@react-navigation/native'

/**
 * Intercepts every way a form screen can be left — hardware back button,
 * the header's own back control, a swipe-back gesture — via navigation's
 * `beforeRemove` event, not `BackHandler` alone (which only covers the
 * hardware button on Android and misses gesture/header navigation
 * entirely). While `isDirty`, leaving prompts a native confirm instead of
 * silently discarding an in-progress file edit; confirming replays the
 * exact navigation action that was blocked.
 */
export function useUnsavedChangesGuard(
  navigation: NavigationProp<Record<string, object | undefined>>,
  isDirty: boolean
): void {
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty) {
        return
      }
      event.preventDefault()
      Alert.alert(
        'تغییرات ذخیره نشده',
        'اطلاعات این فایل ذخیره نشده است. آیا مطمئن هستید که می‌خواهید خارج شوید؟',
        [
          { text: 'ادامه ویرایش', style: 'cancel' },
          {
            text: 'خروج بدون ذخیره',
            style: 'destructive',
            onPress: () => navigation.dispatch(event.data.action)
          }
        ]
      )
    })
    return unsubscribe
  }, [navigation, isDirty])
}
