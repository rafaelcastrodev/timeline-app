import { describe, expect, it } from 'vitest'
import { jsonFile, makeTimelineFile } from '@/test/timeline-file'
import { InvalidImportFileError, MAX_IMPORT_BYTES, parseTimelineFile } from './parse'

async function rejection(file: File): Promise<InvalidImportFileError> {
  const error: unknown = await parseTimelineFile(file).then(
    () => null,
    (cause: unknown) => cause,
  )
  expect(error).toBeInstanceOf(InvalidImportFileError)
  return error as InvalidImportFileError
}

describe('parseTimelineFile', () => {
  it('accepts a valid file and strips unknown fields', async () => {
    const valid = makeTimelineFile()
    const withExtras = {
      ...valid,
      extra: true,
      timeline: { ...valid.timeline, color: 'red' },
      nodes: valid.nodes.map((node) => ({ ...node, timeline_id: 'x', tags: [] })),
    }
    expect(await parseTimelineFile(jsonFile(withExtras))).toEqual(valid)
  })

  it('accepts nodes without a color (older exports) as the default color', async () => {
    const file = makeTimelineFile(2)
    file.nodes[1]!.color = 'amber'
    const legacy = {
      ...file,
      nodes: file.nodes.map(({ color, ...node }, index) =>
        index === 0 ? node : { ...node, color },
      ),
    }
    const parsed = await parseTimelineFile(jsonFile(legacy))
    expect(parsed.nodes.map((node) => node.color)).toEqual([null, 'amber'])
  })

  it('rejects an unknown node color', async () => {
    const file = makeTimelineFile(1)
    const broken = { ...file, nodes: [{ ...file.nodes[0], color: 'slate' }] }
    expect((await rejection(jsonFile(broken))).message).toContain('nodes[0].color: ')
  })

  it('accepts nodes without a layer (older exports) as layer 1', async () => {
    const file = makeTimelineFile(2)
    file.nodes[1]!.layer = 3
    const legacy = {
      ...file,
      nodes: file.nodes.map(({ layer, ...node }, index) =>
        index === 0 ? node : { ...node, layer },
      ),
    }
    const parsed = await parseTimelineFile(jsonFile(legacy))
    expect(parsed.nodes.map((node) => node.layer)).toEqual([1, 3])
  })

  it.each([0, 6, 1.5, '2'])('rejects node layer %j', async (layer) => {
    const file = makeTimelineFile(1)
    const broken = { ...file, nodes: [{ ...file.nodes[0], layer }] }
    expect((await rejection(jsonFile(broken))).message).toContain('nodes[0].layer: ')
  })

  it('trims titles', async () => {
    const file = makeTimelineFile(1)
    file.timeline.title = '  Padded  '
    expect((await parseTimelineFile(jsonFile(file))).timeline.title).toBe('Padded')
  })

  it('rejects files over the size limit before reading them', async () => {
    const file = jsonFile(makeTimelineFile())
    Object.defineProperty(file, 'size', { value: MAX_IMPORT_BYTES + 1 })
    file.text = () => Promise.reject(new Error('must not be read'))
    expect((await rejection(file)).message).toBe('The file is too large. The limit is 10 MB.')
  })

  it('rejects invalid JSON', async () => {
    expect((await rejection(jsonFile('{"format": '))).message).toBe('The file is not valid JSON.')
  })

  it('rejects JSON that is not an export of this app', async () => {
    for (const content of [[], 'null', { format: 'other', schema_version: 1 }]) {
      expect((await rejection(jsonFile(content))).message).toBe(
        'This file is not a Timeline App export.',
      )
    }
  })

  it('rejects an unsupported schema version', async () => {
    const file = { ...makeTimelineFile(), schema_version: 2 }
    expect((await rejection(jsonFile(file))).message).toBe(
      'This export format (schema version 2) is not supported. Supported schema version: 1.',
    )
  })

  it('lists invalid fields with their path', async () => {
    const file = makeTimelineFile(3)
    const broken = {
      ...file,
      timeline: { ...file.timeline, orientation: 'diagonal' },
      nodes: [
        file.nodes[0],
        { ...file.nodes[1], title: ' ' },
        { ...file.nodes[2], created_at: 'x' },
      ],
    }
    const { message } = await rejection(jsonFile(broken))
    expect(message).toMatch(/^The file is invalid: timeline\.orientation: .+; /)
    expect(message).toContain('nodes[1].title: Title is required')
    expect(message).toContain('nodes[2].created_at: ')
  })

  it('reports missing required fields and caps the listed problems', async () => {
    const { timeline, ...rest } = makeTimelineFile()
    void timeline
    const { message } = await rejection(jsonFile({ ...rest, exported_at: 1, nodes: [{}, {}] }))
    expect(message).toMatch(
      /^The file is invalid: exported_at: .+; timeline: .+; nodes\[0\]\.id: .+; and \d+ more problems\.$/,
    )
  })
})
