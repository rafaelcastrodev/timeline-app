import { useCallback, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { importTimeline, replaceTimeline } from '@/db'
import type { Timeline } from '@/types/models'
import type { TimelineFile } from '@/types/transfer'
import { ImportPreview } from './import-preview'
import { InvalidImportFileError, parseTimelineFile } from './parse'

export type ImportTarget =
  /** Creates a new timeline from the file. */
  | { mode: 'new' }
  /** Replaces the content of an existing timeline (destructive). */
  | { mode: 'replace'; timelineId: string }

type Selection = { status: 'invalid'; message: string } | { status: 'ready'; file: TimelineFile }

export interface TimelineImport {
  /** Opens the browser's file picker. Call it from a user gesture (click, menu select). */
  chooseFile: () => void
  /** Hidden file input and the preview/error dialog. Render it once. */
  dialog: ReactNode
}

/**
 * Import flow: file picker, validation, then a dialog that previews the file (title, node count)
 * and asks for confirmation, or shows why the file was rejected. Nothing is written before the
 * user confirms; a failed write shows its error in the dialog.
 */
export function useTimelineImport(
  target: ImportTarget,
  onImported?: (timeline: Timeline) => void | Promise<void>,
): TimelineImport {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  // Kept apart from `selection` so the dialog content does not change while it animates closed.
  const [open, setOpen] = useState(false)

  const chooseFile = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    // Clear the previous choice so picking the same file again still fires `change`.
    input.value = ''
    input.click()
  }, [])

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.currentTarget.files?.[0]
    if (!chosen) return
    try {
      setSelection({ status: 'ready', file: await parseTimelineFile(chosen) })
    } catch (error) {
      const message =
        error instanceof InvalidImportFileError ? error.message : 'The file could not be read.'
      setSelection({ status: 'invalid', message })
    }
    setOpen(true)
  }

  const confirmImport = async (file: TimelineFile) => {
    const timeline =
      target.mode === 'new'
        ? await importTimeline(file)
        : await replaceTimeline(target.timelineId, file)
    await onImported?.(timeline)
  }

  let confirm: ReactNode = null
  if (selection?.status === 'invalid') {
    confirm = (
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Could not import the file"
        description={selection.message}
        confirmLabel="Choose another file"
        cancelLabel="Close"
        // Runs inside the click, so the browser allows opening the file picker.
        onConfirm={chooseFile}
      />
    )
  } else if (selection?.status === 'ready') {
    const replace = target.mode === 'replace'
    confirm = (
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={replace ? 'Replace this timeline?' : 'Import this timeline?'}
        description={
          replace
            ? 'Its title, description, orientation and all of its nodes will be replaced by the content of the file. This cannot be undone.'
            : 'A new timeline will be created from the file.'
        }
        confirmLabel={replace ? 'Replace' : 'Import'}
        destructive={replace}
        onConfirm={() => confirmImport(selection.file)}
      >
        <ImportPreview file={selection.file} />
      </ConfirmDialog>
    )
  }

  const dialog = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label={target.mode === 'new' ? 'File to import' : 'File to replace with'}
        tabIndex={-1}
        className="hidden"
        onChange={(event) => void handleChange(event)}
      />
      {confirm}
    </>
  )

  return { chooseFile, dialog }
}
