import React, { useEffect, useRef, useState } from 'react'
import { AppState, Linking, Platform } from 'react-native'
import { ConfirmDialog } from '@shared/components'
import { checkForUpdate, type AvailableUpdate } from '@infrastructure/updates/updateService'
import { clearDownloadedUpdates } from '@infrastructure/updates/updateDownloader'
import { toPersianDigits } from '@shared/utils/persianText'

/**
 * Amin #5325: check again when the app comes back (was an hour, then 10 minutes); Amin #5727: on every open — only a
 * return within 30 s (a quick glance at another app) is not checked again.
 */
const RECHECK_MS = 30 * 1000

/**
 * 1.5.20 (Navid #6717, Play Protect): the app no longer installs its own update, so it no longer asks Android for the
 * "install apps" permission, the commonest reason for the install-time scan warning. Once at launch and again when the
 * app returns to the foreground (throttled), the KSS server is asked; when a newer version exists, «دریافت» opens its
 * download link in the phone's browser and Android's own installer updates EYVAN in place (same signing key, so the
 * data on the phone stays). A failed or up-to-date check never shows anything; «بعداً» hides that version until the
 * app is opened again. Files the old in-app updater (1.2.0–1.5.19, Amin #4223) left behind are cleared on each check.
 */
export function UpdateChecker(): React.JSX.Element | null {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const lastCheck = useRef(0)

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }
    let cancelled = false
    function check(): void {
      lastCheck.current = Date.now()
      clearDownloadedUpdates().catch(() => undefined)
      checkForUpdate().then((found) => {
        if (!cancelled && found) {
          setUpdate(found)
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
      description={`نسخهٔ ${toPersianDigits(update.version)} EYVAN آماده است.${
        notes ? `\n\n${notes}` : ''
      }\n\nبا «دریافت» فایل نصب در مرورگر گوشی دانلود می‌شود؛ آن را باز کنید و «به‌روزرسانی» را بزنید. اطلاعات شما روی گوشی دست نمی‌خورد.`}
      confirmLabel="دریافت"
      cancelLabel="بعداً"
      onConfirm={() => {
        setDismissedVersion(update.version)
        Linking.openURL(update.downloadUrl).catch(() => setDismissedVersion(null))
      }}
      onCancel={() => setDismissedVersion(update.version)}
    />
  )
}
