import React, { useEffect, useState } from 'react'
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native'
import { useAuth } from '@features/auth/AuthProvider'
import { navigateAcrossTabs } from '@navigation/crossTabNavigate'
import { normalizeSummary, tokenLevel, usedShare } from './tokenLedger'

/**
 * Amin #5815: once 95% of the tokens are used (or the server already refused a save for lack of tokens), a new file
 * or applicant cannot be started — offline too, from the last kept token figures. Opening one leads to «تنظیمات»,
 * where the buy button is, with a short note there. Changes already made stay queued on the phone; nothing is lost.
 */
export const TOKENS_SHORT_NOTICE = 'توکن کافی برای ثبت را ندارید'

let pendingNotice: string | null = null

/** «تنظیمات» takes the note once, when it next comes into view. */
export function takeTokenNotice(): string | null {
  const notice = pendingNotice
  pendingNotice = null
  return notice
}

export function withTokens<P extends object>(
  Screen: React.ComponentType<P>
): React.ComponentType<P> {
  function Tokened(props: P): React.JSX.Element | null {
    const { getTokenLedger, sync } = useAuth()
    const navigation = useNavigation<NavigationProp<ParamListBase>>()
    const [blocked, setBlocked] = useState<boolean | null>(sync.state === 'full' ? true : null)

    useEffect(() => {
      if (blocked !== null) return
      let alive = true
      getTokenLedger()
        .then((result) => {
          const summary = normalizeSummary(result?.ledger.summary)
          if (alive) setBlocked(summary !== null && tokenLevel(usedShare(summary)) === 'danger')
        })
        .catch(() => alive && setBlocked(false))
      return () => {
        alive = false
      }
    }, [blocked, getTokenLedger])

    useEffect(() => {
      if (!blocked) return
      pendingNotice = TOKENS_SHORT_NOTICE
      if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) navigation.goBack()
      navigateAcrossTabs(navigation, 'Settings', undefined)
    }, [blocked, navigation])

    return blocked === false ? <Screen {...props} /> : null
  }
  Tokened.displayName = `withTokens(${Screen.displayName ?? Screen.name ?? 'Screen'})`
  return Tokened
}
