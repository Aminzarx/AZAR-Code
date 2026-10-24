import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Keyboard, Platform, type KeyboardEvent, type View } from 'react-native'

/**
 * Amin #5057: the keyboard must never cover the field being typed in or the save button.
 *
 * Android normally shrinks the window when the keyboard opens (windowSoftInputMode="adjustResize"), but from
 * Android 15 an app that targets SDK 35+ is drawn edge to edge and the window is NOT shrunk any more. So instead of
 * trusting either, this measures what the keyboard really covers: how far the bottom of the given view reaches below
 * the top of the keyboard. 0 when the window was shrunk; the hidden part when it was not. Give that much bottom
 * padding to the same view and its content (the form, the dialog, the bottom button) sits right above the keyboard.
 *
 * Measured again whenever the view's layout changes (a late window resize brings it back to 0).
 */
export function useKeyboardOverlap(): {
  ref: RefObject<View | null>
  onLayout: () => void
  overlap: number
  keyboardOpen: boolean
} {
  const ref = useRef<View | null>(null)
  const keyboardTop = useRef<number | null>(null)
  const [overlap, setOverlap] = useState(0)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  const measure = useCallback(() => {
    const top = keyboardTop.current
    const view = ref.current
    if (top === null || !view) {
      setOverlap(0)
      return
    }
    view.measureInWindow((_x, y, _width, height) => {
      // the padding added below sits inside the view, so it does not move the view's own bottom: no feedback loop
      const hidden = Math.max(0, Math.round(y + height - top))
      setOverlap((current) => (Math.abs(current - hidden) <= 1 ? current : hidden))
    })
  }, [])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const shown = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY
      setKeyboardOpen(true)
      measure()
    })
    const hidden = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null
      setKeyboardOpen(false)
      setOverlap(0)
    })
    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [measure])

  return { ref, onLayout: measure, overlap, keyboardOpen }
}

/** How far to scroll so that a field (top/bottom in the scrolled content) shows inside the visible part, with a margin. */
export function scrollToShow(
  field: { top: number; bottom: number },
  view: { scrollY: number; height: number },
  margin = 24
): number | null {
  if (field.bottom + margin > view.scrollY + view.height)
    return Math.max(0, field.bottom + margin - view.height)
  if (field.top - margin < view.scrollY) return Math.max(0, field.top - margin)
  return null
}
