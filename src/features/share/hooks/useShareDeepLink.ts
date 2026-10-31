import { useEffect } from 'react'
import { Linking } from 'react-native'
import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import { shareCodeOf } from '../shareFile'

type Go = (name: string, params?: object) => void

/** codes already opened in this run (the launch link stays the «initial URL» for the whole run) */
const opened = new Set<string>()

/**
 * Amin #6339/#6523: «eyvan://share?c=…» (the SMS, the share sheet, another app's QR reader) opens EYVAN straight on
 * «دریافت فایل». Android hands the link to the app only (AndroidManifest: scheme eyvan, host share); there is no web
 * page for it. Mounted on Home, which exists only while signed in, so a link that started the app waits for sign-in.
 */
export function useShareDeepLink(navigation: NavigationProp<ParamListBase>): void {
  useEffect(() => {
    const open = (url: string | null): void => {
      const code = shareCodeOf(url)
      if (!code || opened.has(code)) return
      opened.add(code)
      const parent = typeof navigation.getParent === 'function' ? navigation.getParent() : undefined
      // shown on Home's own stack (Home stays mounted in every tab), with the Home tab brought to the front
      if (parent) (parent.navigate as Go)('HomeTab', { screen: 'ReceiveFile', params: { code } })
      else (navigation.navigate as Go)('ReceiveFile', { code })
    }
    Linking.getInitialURL()
      .then(open)
      .catch(() => undefined)
    const subscription = Linking.addEventListener('url', ({ url }) => open(url))
    return () => subscription.remove()
  }, [navigation])
}
