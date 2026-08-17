import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

/**
 * Real connectivity state via NetInfo, not a fabricated value (see
 * design-system.md §17.7 — no fabricated data). `null` until the first
 * event/fetch resolves, so callers can tell "not known yet" from "offline".
 */
export function useNetworkStatus(): boolean | null {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
    })
    NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
    })
    return unsubscribe
  }, [])

  return isOnline
}
