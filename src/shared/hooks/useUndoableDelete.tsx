import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@shared/components/ConfirmDialog'
import { RowActionSheet } from '@shared/components/RowActionSheet'
import { Snackbar } from '@shared/components/Snackbar'

const UNDO_MS = 5000

type Options = {
  /** what the record is called in the confirm text, e.g. «معامله» */
  noun: string
  /** the real (irreversible) delete; runs once the undo window closes */
  remove: (id: string) => Promise<void>
  /** reload the list after the delete went through */
  onDeleted?: () => void
  /** #5716: why this one cannot be deleted (linked records), asked before the confirm; null = it can */
  blockedBy?: (id: string) => Promise<string | null>
}

/**
 * v1.4.0 (Amin #4315): long-press a list row → sheet «حذف» → confirm →
 * the row disappears at once and a snackbar offers «برگردان» for 5 s.
 * The records are hard-deleted by the services, so the delete is held
 * back until the snackbar closes: «برگردان» simply cancels it. Leaving
 * the screen commits a pending delete right away.
 *
 * Returns `hidden` (ids to leave out of the list), `onLongPress(id, title)`
 * for the rows, and `ui` to render once at the end of the screen.
 */
export function useUndoableDelete({ noun, remove, onDeleted, blockedBy }: Options) {
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [pending, setPending] = useState<{ id: string; title: string } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ id: string; title: string } | null>(null)
  const removeRef = useRef(remove)
  const deletedRef = useRef(onDeleted)
  removeRef.current = remove
  deletedRef.current = onDeleted

  const commit = useCallback(
    async (id: string) => {
      try {
        await removeRef.current(id)
      } catch (error) {
        // #5716: it did not go: the row comes back and the user is told (it used to vanish until the next visit)
        setHidden((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        setProblem(
          error instanceof Error && error.name === 'LinkedRecordsError'
            ? error.message
            : `${noun} حذف نشد. دوباره تلاش کنید.`
        )
      } finally {
        deletedRef.current?.()
      }
    },
    [noun]
  )

  useEffect(() => {
    if (!problem) return undefined
    const t = setTimeout(() => setProblem(null), 5000)
    return () => clearTimeout(t)
  }, [problem])

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const p = pendingRef.current
    pendingRef.current = null
    setPending(null)
    if (p) {
      commit(p.id).catch(() => undefined)
    }
  }, [commit])

  // leaving the screen: whatever is waiting goes through now
  useEffect(() => () => flush(), [flush])

  const onLongPress = useCallback((id: string, title: string) => setTarget({ id, title }), [])

  const confirmDelete = useCallback(() => {
    const t = target
    setConfirming(false)
    setTarget(null)
    if (!t) {
      return
    }
    flush() // one undo at a time: an earlier pending delete goes through
    setHidden((prev) => new Set(prev).add(t.id))
    pendingRef.current = t
    setPending(t)
    timer.current = setTimeout(flush, UNDO_MS)
  }, [target, flush])

  const undo = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const p = pendingRef.current
    pendingRef.current = null
    setPending(null)
    if (p) {
      setHidden((prev) => {
        const next = new Set(prev)
        next.delete(p.id)
        return next
      })
    }
  }, [])

  const ui = (
    <>
      <RowActionSheet
        visible={Boolean(target) && !confirming}
        title={target?.title ?? ''}
        onDelete={() => {
          const t = target
          if (!t || !blockedBy) {
            setConfirming(true)
            return
          }
          blockedBy(t.id)
            .then((reason) => {
              if (reason) {
                setTarget(null)
                setProblem(reason)
              } else setConfirming(true)
            })
            .catch(() => setConfirming(true))
        }}
        onClose={() => setTarget(null)}
      />
      <ConfirmDialog
        visible={confirming}
        title={`حذف ${noun}`}
        description={`«${target?.title ?? ''}» حذف شود؟ تا چند ثانیه بعد می‌توانید آن را برگردانید.`}
        confirmLabel="حذف"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirming(false)
          setTarget(null)
        }}
      />
      <Snackbar
        visible={Boolean(pending)}
        message={`${noun} حذف شد`}
        actionLabel="برگردان"
        onAction={undo}
      />
      <Snackbar visible={!pending && problem !== null} message={problem ?? ''} />
    </>
  )

  return { hidden, onLongPress, ui }
}
