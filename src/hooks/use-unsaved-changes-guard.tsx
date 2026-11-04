import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

export interface UnsavedChangesGuard {
  /**
   * Runs `action` right away when the form is clean, after the user confirms discarding the
   * changes otherwise. The action runs with the guard bypassed, so a navigation it starts is not
   * blocked a second time.
   */
  confirmDiscard: (action: () => void) => void
  /**
   * Runs `action` with the guard bypassed. Use it right after a successful save: the form has
   * reset its dirty state, but the guard still holds the dirty value until the next render.
   */
  bypass: (action: () => void) => void
  /** Confirmation dialog. Render it inside the guarded form. */
  dialog: ReactNode
}

/**
 * Asks for confirmation before unsaved changes are lost. While `isDirty`:
 * - in-app navigation and browser back are blocked (`useBlocker`) until the user confirms; route
 *   dialogs close by navigating, so their X, Esc and overlay click are covered too;
 * - closing or reloading the tab shows the browser's own `beforeunload` prompt;
 * - `confirmDiscard` covers actions that do not navigate (e.g. Cancel back to a read view).
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const bypassed = useRef(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const shouldBlock = useCallback(() => isDirty && !bypassed.current, [isDirty])
  const blocker = useBlocker(shouldBlock)

  // A bypass lasts until the dirty flag changes: by then the blocker sees the current value.
  useEffect(() => {
    bypassed.current = false
  }, [isDirty])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Older browsers only prompt when `returnValue` is set.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const bypass = useCallback((action: () => void) => {
    bypassed.current = true
    action()
  }, [])

  const confirmDiscard = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingAction(() => action)
      else bypass(action)
    },
    [bypass, isDirty],
  )

  const blocked = blocker.state === 'blocked'

  const dialog = (
    <ConfirmDialog
      open={blocked || pendingAction !== null}
      onOpenChange={(open) => {
        if (!open) setPendingAction(null)
      }}
      title="Discard unsaved changes?"
      description="Your changes will be lost."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      destructive
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed()
        else if (pendingAction) bypass(pendingAction)
      }}
      onCancel={() => {
        if (blocker.state === 'blocked') blocker.reset()
      }}
    />
  )

  return { confirmDiscard, bypass, dialog }
}
