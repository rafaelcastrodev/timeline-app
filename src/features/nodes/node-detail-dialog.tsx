import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { RouteDialog } from '@/components/common/route-dialog'
import { MarkdownBlock, MarkdownInline } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteNode, updateNode, useNode } from '@/db'
import { useCloseRoute } from '@/hooks/use-close-route'
import type { NodeColor, Timeline } from '@/types/models'
import { nodeHeaderClasses } from './node-colors'
import { NodeForm } from './node-form'

/**
 * Child route of the timeline view, which passes the loaded timeline as outlet context. Opens in
 * read mode; "Edit" swaps the content for the form inside the same dialog, and saving or
 * cancelling returns to read mode.
 */
export function NodeDetailDialog() {
  const timeline = useOutletContext<Timeline>()
  const { nodeId } = useParams()
  const node = useNode(nodeId)
  const close = useCloseRoute(`/timelines/${timeline.id}`)
  const [editing, setEditing] = useState(false)
  // Color picked in the edit form, previewed in the header until the form is left.
  const [draftColor, setDraftColor] = useState<NodeColor | null | undefined>(undefined)
  // Set when leaving the form, so the Edit button gets focus back.
  const [focusEdit, setFocusEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // While deleting, the live query reports the node as missing before the route closes.
  const [deleting, setDeleting] = useState(false)

  if (node === undefined) {
    return (
      <RouteDialog title="Loading node" onClose={close}>
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </RouteDialog>
    )
  }

  if (node === null || node.timeline_id !== timeline.id) {
    if (deleting) return null
    return (
      <RouteDialog title="Node not found" description="It may have been deleted." onClose={close}>
        <div className="mt-auto flex justify-end">
          <Button variant="outline" onClick={close}>
            Close
          </Button>
        </div>
      </RouteDialog>
    )
  }

  if (editing) {
    const leaveForm = () => {
      setEditing(false)
      setDraftColor(undefined)
      setFocusEdit(true)
    }
    return (
      <RouteDialog
        title="Edit node"
        headerClassName={nodeHeaderClasses(draftColor === undefined ? node.color : draftColor)}
        onClose={close}
      >
        <NodeForm
          defaultValues={{
            title: node.title,
            description: node.description,
            color: node.color,
            layer: node.layer,
          }}
          submitLabel="Save"
          autoFocusTitle
          onSubmit={(values) => updateNode(node.id, values)}
          onSaved={() => {
            toast.success('Node saved')
            leaveForm()
          }}
          onCancel={leaveForm}
          onColorChange={setDraftColor}
        />
      </RouteDialog>
    )
  }

  return (
    <RouteDialog
      title={<MarkdownInline>{node.title}</MarkdownInline>}
      headerClassName={nodeHeaderClasses(node.color)}
      onClose={close}
    >
      <div className="flex flex-1 flex-col gap-6">
        {node.description.trim() ? (
          <MarkdownBlock>{node.description}</MarkdownBlock>
        ) : (
          <p className="text-muted-foreground">No description.</p>
        )}

        <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="destructive"
            className="sm:mr-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon aria-hidden="true" />
            Delete
          </Button>
          <Button autoFocus={focusEdit} onClick={() => setEditing(true)}>
            <PencilIcon aria-hidden="true" />
            Edit
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this node?"
        description="The node will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setDeleting(true)
          try {
            await deleteNode(node.id)
          } catch (error) {
            setDeleting(false)
            throw error
          }
          toast.success('Node deleted')
          close()
        }}
      />
    </RouteDialog>
  )
}
