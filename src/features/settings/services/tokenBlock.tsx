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

/**
 * Amin #5975: the last answer to «is a new file or applicant blocked?», kept for the app's lifetime. The form opens
 * at once from it (never a white page while the server is asked); the check still runs behind the open form.
 */
let lastBlocked: boolean | null = null

/** «تنظیمات» takes the note once, when it next comes into view. */
export function takeTokenNotice(): string | null {
  const notice = pendingNotice
  pendingNotice = null
  return notice
}

/** Every fresh token figure (the form's own check, «تنظیمات» after a purchase) updates the kept answer. */
export function noteTokenSummary(summary: ReturnType<typeof normalizeSummary>): boolean {
  lastBlocked = summary !== null && tokenLevel(usedShare(summary)) === 'danger'
  return lastBlocked
}

/** for tests: forget the kept answer */
export function resetTokenBlock(): void {
  lastBlocked = null
}

export function withTokens<P extends object>(
  Screen: React.ComponentType<P>
): React.ComponentType<P> {
  function Tokened(props: P): React.JSX.Element | null {
    const { getTokenLedger, sync } = useAuth()
    const navigation = useNavigation<NavigationProp<ParamListBase>>()
    // Amin #5975: the form is drawn straight away unless it is already known to be blocked
    const [blocked, setBlocked] = useState<boolean>(sync.state === 'full' || lastBlocked === true)

    // runs even when the kept answer blocked this open, so the next open follows a purchase made since
    useEffect(() => {
      let alive = true
      getTokenLedger()
        .then((result) => {
          const next = noteTokenSummary(normalizeSummary(result?.ledger.summary))
          if (alive && next) setBlocked(true)
        })
        .catch(() => undefined)
      return () => {
        alive = false
      }
    }, [getTokenLedger])

    useEffect(() => {
      if (!blocked) return
      pendingNotice = TOKENS_SHORT_NOTICE
      if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) navigation.goBack()
      navigateAcrossTabs(navigation, 'Settings', undefined)
    }, [blocked, navigation])

    return blocked ? null : <Screen {...props} />
  }
  Tokened.displayName = `withTokens(${Screen.displayName ?? Screen.name ?? 'Screen'})`
  return Tokened
}
