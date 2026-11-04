import {
  ArrowLeftIcon,
  FileDownIcon,
  FileUpIcon,
  ListPlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchXIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { MarkdownBlock, MarkdownInline } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteTimeline, updateTimeline, useNodes, useTimeline } from '@/db'
import { NodeList } from '@/features/nodes/node-list'
import { downloadTimeline } from '@/features/transfer/export'
import { useTimelineImport } from '@/features/transfer/use-timeline-import'
import { pageHeadingProps } from '@/lib/focus'
import type { Timeline } from '@/types/models'
import { OrientationToggle } from './orientation-toggle'

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
  const replaceFlow = useTimelineImport({ mode: 'replace', timelineId: timeline.id })

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 py-3 lg:px-4">
        <BackToList />
        <h2 {...pageHeadingProps} className="min-w-0 flex-1 text-lg font-semibold outline-none">
          <MarkdownInline>{timeline.title}</MarkdownInline>
        </h2>
        <OrientationToggle
          value={timeline.orientation}
          onChange={(orientation) => {
            // The live query re-renders with the stored value; on failure the toggle stays put.
            updateTimeline(timeline.id, { orientation }).catch((error: unknown) => {
              console.error(error)
              toast.error('Could not change the orientation. Try again.')
            })
          }}
        />
        {/* Floating action button below `lg`, regular header button from `lg` up. */}
        <Button
          asChild
          className="fixed right-4 bottom-4 z-20 size-14 rounded-full shadow-lg lg:static lg:z-auto lg:size-auto lg:rounded-lg lg:shadow-none"
        >
          <Link to="nodes/new" aria-label="Add node">
            <PlusIcon aria-hidden="true" className="size-6 lg:size-4" />
            <span className="sr-only lg:not-sr-only">Node</span>
          </Link>
        </Button>
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
            <DropdownMenuItem
              onSelect={() => {
                downloadTimeline(timeline.id).then(
                  () => toast.success('Timeline exported'),
                  (error: unknown) => {
                    console.error(error)
                    toast.error('Could not export the timeline. Try again.')
                  },
                )
              }}
            >
              <FileDownIcon aria-hidden="true" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={replaceFlow.chooseFile}>
              <FileUpIcon aria-hidden="true" />
              Replace from file
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2Icon aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {timeline.description.trim() && (
        <section aria-label="Description" className="px-4 pt-4 lg:px-6">
          <MarkdownBlock>{timeline.description}</MarkdownBlock>
        </section>
      )}

      {/* Bottom padding keeps the last card clear of the floating action button on mobile. */}
      <div className="pb-20 lg:pb-4">
        <TimelineNodes timeline={timeline} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this timeline?"
        description="The timeline and all of its nodes will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteTimeline(timeline.id)
          toast.success('Timeline deleted')
          await navigate('/', { replace: true })
        }}
      />

      {replaceFlow.dialog}

      <Outlet context={timeline} />
    </div>
  )
}

function TimelineNodes({ timeline }: { timeline: Timeline }) {
  const nodes = useNodes(timeline.id)

  if (nodes === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading nodes" className="flex flex-col gap-4 p-4 lg:px-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full max-w-2xl" />
        ))}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={ListPlusIcon}
        title="No nodes yet"
        description="Add the first event to this timeline."
        action={
          <Button asChild variant="outline">
            <Link to="nodes/new">Add first node</Link>
          </Button>
        }
      />
    )
  }

  return <NodeList timelineId={timeline.id} nodes={nodes} orientation={timeline.orientation} />
}
