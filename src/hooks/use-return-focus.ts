import { useCallback, useMemo, useRef } from 'react'
import { focusOrigin, restoreFocus } from '@/lib/focus'

/**
 * Focus return for dialogs without a Radix `Trigger` (route dialogs, confirmations), where Radix
 * would leave focus on `<body>`. Spread the result on the dialog content: it records the focused
 * element when the dialog opens and focuses it again on close, or the page heading when that
 * element is gone or hidden (deleted card, list pane hidden on small screens).
 */
export function useReturnFocus() {
  const origin = useRef<HTMLElement | null>(null)

  // Runs before Radix moves focus into the dialog, so the opener is still focused.
  const onOpenAutoFocus = useCallback(() => {
    origin.current = focusOrigin()
  }, [])

  const onCloseAutoFocus = useCallback((event: Event) => {
    event.preventDefault()
    restoreFocus(origin.current)
  }, [])

  return useMemo(() => ({ onOpenAutoFocus, onCloseAutoFocus }), [onOpenAutoFocus, onCloseAutoFocus])
}
