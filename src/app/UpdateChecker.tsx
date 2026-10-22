import React, { useEffect, useRef, useState } from 'react'
import { AppState, Linking } from 'react-native'
import { ConfirmDialog } from '@shared/components'
import { checkForUpdate, type AvailableUpdate } from '@infrastructure/updates/updateService'
import { toPersianDigits } from '@shared/utils/persianText'

/** v1.1.0 (Amin #4216): check again when the app comes back, at most once an hour. */
const RECHECK_MS = 60 * 60 * 1000

/**
 * Best-effort, silent update check: once at launch and again whenever the
 * app returns to the foreground (throttled). Renders nothing until a
 * genuinely newer version is found; a failed or up-to-date check never
 * shows anything, and offline it simply finds nothing. «بعداً» hides that
 * version until the app is opened again. Confirming opens the install
 * file's URL in the device browser rather than installing in-app, which
 * would need REQUEST_INSTALL_PACKAGES + a FileProvider install intent —
 * the browser download + OS "open file to install" flow needs neither,
 * and the app's data stays as it is.
 */
export function UpdateChecker(): React.JSX.Element | null {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const lastCheck = useRef(0)

  useEffect(() => {
    let cancelled = false
    function check(): void {
      lastCheck.current = Date.now()
      checkForUpdate().then((result) => {
        if (!cancelled && result) {
          setUpdate(result)
        }
      })
    }
    check()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastCheck.current >= RECHECK_MS) {
        check()
      }
    })
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [])

  if (!update || dismissedVersion === update.version) {
    return null
  }

  const notes = update.releaseNotes.trim()
  return (
    <ConfirmDialog
      visible
      title="نسخهٔ تازه آماده است"
      description={`نسخهٔ ${toPersianDigits(update.version)} AZAR آماده است.${
        notes ? `\n\n${notes}` : ''
      }\n\nاطلاعات شما روی گوشی دست نمی‌خورد.`}
      confirmLabel="دریافت و نصب"
      cancelLabel="بعداً"
      onConfirm={() => {
        Linking.openURL(update.downloadUrl)
        setDismissedVersion(update.version)
      }}
      onCancel={() => setDismissedVersion(update.version)}
    />
  )
}
