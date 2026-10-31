import React, { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { ConfirmDialog } from '@shared/components'
import { checkForUpdate, type AvailableUpdate } from '@infrastructure/updates/updateService'
import { clearDownloadedUpdates, downloadUpdate } from '@infrastructure/updates/updateDownloader'
import {
  canInstallUpdates,
  installUpdate,
  isInAppInstallSupported,
  openInstallPermission
} from '@infrastructure/updates/appInstaller'
import { toPersianDigits } from '@shared/utils/persianText'

/**
 * Amin #5325: check again when the app comes back (was an hour, then 10 minutes); Amin #5727: on every open — only a
 * return within 30 s (a quick glance at another app) is not checked again.
 */
const RECHECK_MS = 30 * 1000

type ReadyUpdate = { update: AvailableUpdate; path: string }

/**
 * v1.2.0 (Amin #4223): the update never leaves the app. Once at launch
 * and again when the app returns to the foreground (throttled), the KSS
 * server is asked; a newer version is downloaded quietly in the
 * background and checked, and only then «نصب» is offered. Android's own
 * installer opens over the app. The first time, Android needs a one-time
 * "install from this source" permission: that is explained first, and
 * after the user turns it on and comes back the install continues by
 * itself. A failed or up-to-date check never shows anything; «بعداً»
 * hides that version until the app is opened again.
 */
export function UpdateChecker(): React.JSX.Element | null {
  const [ready, setReady] = useState<ReadyUpdate | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)
  const lastCheck = useRef(0)
  const readyRef = useRef<ReadyUpdate | null>(null)
  const waitingForPermission = useRef(false)

  useEffect(() => {
    if (!isInAppInstallSupported()) {
      return
    }
    let cancelled = false
    function check(): void {
      lastCheck.current = Date.now()
      checkForUpdate().then(async (update) => {
        if (!update) {
          await clearDownloadedUpdates()
          return
        }
        const path = await downloadUpdate(update)
        if (!cancelled && path) {
          readyRef.current = { update, path }
          setReady(readyRef.current)
        }
      })
    }
    check()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return
      }
      if (waitingForPermission.current && readyRef.current) {
        waitingForPermission.current = false
        const { path, update } = readyRef.current
        canInstallUpdates().then((allowed) => {
          if (allowed && !cancelled) {
            setDismissedVersion(update.version)
            installUpdate(path).catch(() => setDismissedVersion(null))
          }
        })
        return
      }
      if (Date.now() - lastCheck.current >= RECHECK_MS) {
        check()
      }
    })
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [])

  if (!ready || dismissedVersion === ready.update.version) {
    return null
  }

  if (needsPermission) {
    return (
      <ConfirmDialog
        visible
        title="یک اجازهٔ یک‌باره"
        description={
          'اندروید برای نصب نسخهٔ تازه از داخل EYVAN یک بار اجازه می‌خواهد. در صفحه‌ای که باز می‌شود «اجازه از این منبع» را روشن کنید و برگردید؛ نصب خودش ادامه پیدا می‌کند.'
        }
        confirmLabel="باز کردن تنظیمات"
        cancelLabel="بعداً"
        onConfirm={() => {
          waitingForPermission.current = true
          setNeedsPermission(false)
          openInstallPermission().catch(() => {
            waitingForPermission.current = false
          })
        }}
        onCancel={() => {
          setNeedsPermission(false)
          setDismissedVersion(ready.update.version)
        }}
      />
    )
  }

  async function handleInstall(current: ReadyUpdate): Promise<void> {
    if (!(await canInstallUpdates())) {
      setNeedsPermission(true)
      return
    }
    setDismissedVersion(current.update.version)
    installUpdate(current.path).catch(() => setDismissedVersion(null))
  }

  const notes = ready.update.releaseNotes.trim()
  return (
    <ConfirmDialog
      visible
      title="نسخهٔ تازه آماده است"
      description={`نسخهٔ ${toPersianDigits(ready.update.version)} EYVAN دریافت شد و آمادهٔ نصب است.${
        notes ? `\n\n${notes}` : ''
      }\n\nاطلاعات شما روی گوشی دست نمی‌خورد.`}
      confirmLabel="نصب"
      cancelLabel="بعداً"
      onConfirm={() => {
        handleInstall(ready)
      }}
      onCancel={() => setDismissedVersion(ready.update.version)}
    />
  )
}
