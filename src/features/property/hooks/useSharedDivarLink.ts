import { useEffect } from 'react'
import { AppState, NativeModules, Platform } from 'react-native'
import { divarLinkIn } from '../services/divarImport'

type AzarShare = { takeShared(): Promise<string | null> }
type Navigator = { navigate: (screen: 'CreateProperty', params: { divarLink: string }) => void }

/**
 * Navid 2026-10-27 «ورود آگهی از دیوار»: a Divar post shared into EYVAN (Android's share sheet → AzarShareModule)
 * opens a new file filled from it. Checked when the app starts and each time it comes back to the front.
 */
export function useSharedDivarLink(navigation: Navigator): void {
  useEffect(() => {
    const share = Platform.OS === 'android' ? (NativeModules.AzarShare as AzarShare | undefined) : undefined
    if (!share) return
    const take = (): void => {
      share
        .takeShared()
        .then((text) => {
          const link = divarLinkIn(text)
          if (link) navigation.navigate('CreateProperty', { divarLink: link })
        })
        .catch(() => undefined)
    }
    take()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') take()
    })
    return () => subscription.remove()
  }, [navigation])
}
