import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RouteDialogProps {
  title: string
  description?: string
  /** Called on X, Esc and overlay click. Typically navigates away from the dialog's route. */
  onClose: () => void
  children: ReactNode
}

/**
 * Dialog whose open state is its route: it is open while mounted. Full screen below `lg`,
 * centered modal from `lg` up.
 */
export function RouteDialog({ title, description, onClose, children }: RouteDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // Without a description, opt out of Radix's aria-describedby wiring (and its warning).
        {...(description ? {} : { 'aria-describedby': undefined })}
        className="inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none ring-0 sm:max-w-none lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-auto lg:max-h-[calc(100dvh-4rem)] lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:ring-1"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
