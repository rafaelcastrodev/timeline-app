import { XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReturnFocus } from '@/hooks/use-return-focus'
import { cn } from '@/lib/utils'

interface RouteDialogProps {
  /** Dialog heading and accessible name. May be rendered Markdown (node titles). */
  title: ReactNode
  description?: string
  /** Extra classes for the header bar, e.g. a node color background. */
  headerClassName?: string
  /** Called on X, Esc and overlay click. Typically navigates away from the dialog's route. */
  onClose: () => void
  children: ReactNode
}

/**
 * Dialog whose open state is its route: it is open while mounted. Full screen below `lg`,
 * centered modal from `lg` up. The title and the close button sit in a header bar that stays at
 * the top while the content scrolls. On close, focus returns to the element that opened it (or the
 * page heading when that element is gone).
 */
export function RouteDialog({
  title,
  description,
  headerClassName,
  onClose,
  children,
}: RouteDialogProps) {
  const returnFocus = useReturnFocus()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...returnFocus}
        // Without a description, opt out of Radix's aria-describedby wiring (and its warning).
        {...(description ? {} : { 'aria-describedby': undefined })}
        showCloseButton={false}
        className="inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none pt-0 ring-0 sm:max-w-none lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-auto lg:max-h-[calc(100dvh-4rem)] lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:ring-1"
      >
        <DialogHeader
          data-slot="route-dialog-header"
          className={cn(
            'sticky top-0 z-10 -mx-4 flex-row items-start gap-2 border-b bg-popover py-3 pr-2 pl-4',
            headerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1.5">
            <DialogTitle className="leading-snug break-words">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
