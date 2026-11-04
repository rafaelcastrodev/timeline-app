import { exportTimeline } from '@/db'
import { slugify } from '@/lib/slug'
import type { TimelineFile } from '@/types/transfer'

/** `timeline-<slug>-<yyyymmdd>.json`, dated in local time. */
export function exportFileName(title: string, date: Date = new Date()): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  return `timeline-${slugify(title)}-${day}.json`
}

export function serializeTimelineFile(file: TimelineFile): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoke after the click has been handled, so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Exports a timeline and saves it as a JSON file through the browser's download. */
export async function downloadTimeline(timelineId: string): Promise<void> {
  const file = await exportTimeline(timelineId)
  const blob = new Blob([serializeTimelineFile(file)], { type: 'application/json' })
  downloadBlob(blob, exportFileName(file.timeline.title, new Date(file.exported_at)))
}
