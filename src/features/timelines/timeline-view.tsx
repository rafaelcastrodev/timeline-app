import { ArrowLeftIcon, MoreVerticalIcon, PencilIcon, SearchXIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { MarkdownBlock, MarkdownInline } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteTimeline, useTimeline } from '@/db'
import type { Timeline } from '@/types/models'

function BackToList() {
  return (
    <Button asChild variant="ghost" size="icon" className="lg:hidden">
      <Link to="/" aria-label="Back to timelines">
        <ArrowLeftIcon aria-hidden="true" />
      </Link>
    </Button>
  )
}

/** Detail pane for the selected timeline. Child routes (edit) receive it as outlet context. */
export function TimelineView() {
  const { timelineId } = useParams()
  const timeline = useTimeline(timelineId)

  if (timeline === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading timeline" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (timeline === null) {
    return (
      <div className="flex flex-col">
        <header className="flex items-center gap-2 px-2 py-3">
          <BackToList />
        </header>
        <EmptyState
          icon={SearchXIcon}
          title="Timeline not found"
          description="It may have been deleted."
          action={
            <Button asChild variant="outline">
              <Link to="/">Back to timelines</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return <TimelineDetail timeline={timeline} />
}

function TimelineDetail({ timeline }: { timeline: Timeline }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 py-3 lg:px-4">
        <BackToList />
        <h2 className="min-w-0 flex-1 text-lg font-semibold">
          <MarkdownInline>{timeline.title}</MarkdownInline>
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Timeline actions">
              <MoreVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="edit">
                <PencilIcon aria-hidden="true" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2Icon aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {timeline.description.trim() && (
        <section aria-label="Description" className="p-4">
          <MarkdownBlock>{timeline.description}</MarkdownBlock>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this timeline?"
        description="The timeline and all of its nodes will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteTimeline(timeline.id)
          await navigate('/', { replace: true })
        }}
      />

      <Outlet context={timeline} />
    </div>
  )
}
