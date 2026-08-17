import { useEffect, useRef, useState } from 'react'
import type { NavigationProp } from '@react-navigation/native'

type NavigationAction = { type: string; payload?: object; source?: string; target?: string }

type UnsavedChangesDialogProps = {
  visible: boolean
  title: string
  description: string
  confirmLabel: string
  destructive: true
  onConfirm: () => void
  onCancel: () => void
}

type UnsavedChangesGuard = {
  /**
   * Call synchronously right before navigating away after a successful
   * save (e.g. `navigation.replace(...)`) — a plain ref write, so it
   * takes effect within the same call stack, unlike `setIsDirty(false)`:
   * that's a state update, and `beforeRemove` fires from the very same
   * synchronous navigation call, before React has re-rendered with the
   * new `isDirty` value. Without this, the guard fired its own confirm
   * dialog on a *successful* save.
   */
  markSaved: () => void
  /** Spread onto a `<ConfirmDialog />` rendered by the caller. */
  unsavedChangesDialogProps: UnsavedChangesDialogProps
}

/**
 * Intercepts every way a form screen can be left — hardware back button,
 * the header's own back control, a swipe-back gesture — via navigation's
 * `beforeRemove` event, not `BackHandler` alone (which only covers the
 * hardware button on Android and misses gesture/header navigation
 * entirely). While `isDirty`, leaving prompts the app's own `ConfirmDialog`
 * (design-system.md §7.9 — every confirm/prompt surface is the in-app
 * "glass" dialog, never the OS-native `Alert.alert`) instead of silently
 * discarding an in-progress file edit; confirming replays the exact
 * navigation action that was blocked.
 */
export function useUnsavedChangesGuard(
  navigation: NavigationProp<Record<string, object | undefined>>,
  isDirty: boolean
): UnsavedChangesGuard {
  const bypassRef = useRef(false)
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(null)

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (bypassRef.current || !isDirty) {
        return
      }
      event.preventDefault()
      setPendingAction(event.data.action)
    })
    return unsubscribe
  }, [navigation, isDirty])

  return {
    markSaved: () => {
      bypassRef.current = true
    },
    unsavedChangesDialogProps: {
      visible: pendingAction !== null,
      title: 'تغییرات ذخیره نشده',
      description: 'اطلاعات این فایل ذخیره نشده است. آیا مطمئن هستید که می‌خواهید خارج شوید؟',
      confirmLabel: 'خروج بدون ذخیره',
      destructive: true,
      onConfirm: () => {
        if (pendingAction) {
          navigation.dispatch(pendingAction)
        }
        setPendingAction(null)
      },
      onCancel: () => setPendingAction(null)
    }
  }
}
