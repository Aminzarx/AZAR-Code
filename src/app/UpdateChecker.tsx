import React, { useEffect, useState } from 'react'
import { Linking } from 'react-native'
import { ConfirmDialog } from '@shared/components'
import { checkForUpdate, type AvailableUpdate } from '@infrastructure/updates/updateService'

/**
 * Best-effort, silent update check run once per app launch. Renders
 * nothing until a genuinely newer release is found; a failed or
 * up-to-date check just never shows a dialog. Confirming opens the
 * release's APK URL in the device browser rather than downloading and
 * installing in-app, which would need REQUEST_INSTALL_PACKAGES + a
 * FileProvider install intent — the browser download + OS "open file to
 * install" flow needs neither.
 */
export function UpdateChecker(): React.JSX.Element | null {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkForUpdate().then((result) => {
      if (!cancelled) {
        setUpdate(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!update || isDismissed) {
    return null
  }

  return (
    <ConfirmDialog
      visible
      title="بروزرسانی جدید موجود است"
      description={`نسخه ${update.version} آزار منتشر شده است. برای دریافت آخرین امکانات و رفع اشکالات، بروزرسانی کنید.`}
      confirmLabel="دانلود بروزرسانی"
      cancelLabel="بعدا"
      onConfirm={() => {
        Linking.openURL(update.downloadUrl)
        setIsDismissed(true)
      }}
      onCancel={() => setIsDismissed(true)}
    />
  )
}
