import { describe, expect, it } from 'vitest'
import { exportFileName, serializeTimelineFile } from './export'
import { makeTimelineFile } from '@/test/timeline-file'

describe('export helpers', () => {
  it('names the file after the title slug and the local date', () => {
    expect(exportFileName('**Road** trip', new Date(2026, 0, 5, 23, 59))).toBe(
      'timeline-road-trip-20260105.json',
    )
    expect(exportFileName('!!!', new Date(2026, 10, 30))).toBe('timeline-untitled-20261130.json')
  })

  it('serializes as indented JSON that parses back to the same data', () => {
    const file = makeTimelineFile()
    const text = serializeTimelineFile(file)
    expect(text).toContain('\n  "format": "timeline-app",\n')
    expect(JSON.parse(text)).toEqual(file)
  })
})
