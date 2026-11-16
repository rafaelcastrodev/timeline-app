import { z } from 'zod'

export const orientationSchema = z.enum(['vertical', 'horizontal'])
export type Orientation = z.infer<typeof orientationSchema>

/** Card colors: the chromatic hues of the Tailwind palette. `null` on a node means the default card. */
export const NODE_COLORS = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const
export const nodeColorSchema = z.enum(NODE_COLORS)
export type NodeColor = z.infer<typeof nodeColorSchema>

/** Story layers a node can belong to (`1` is the default). The timeline view can focus one layer. */
export const NODE_LAYERS = [1, 2, 3, 4, 5] as const
export const DEFAULT_NODE_LAYER = 1
export const nodeLayerSchema = z.int().min(1).max(NODE_LAYERS.length)
export type NodeLayer = z.infer<typeof nodeLayerSchema>

/** Severity of a node, from 1 to 5 (`1` is the default). Stored only; no effect on the view. */
export const NODE_SEVERITIES = [1, 2, 3, 4, 5] as const
export const DEFAULT_NODE_SEVERITY = 1
export const nodeSeveritySchema = z.int().min(1).max(NODE_SEVERITIES.length)
export type NodeSeverity = z.infer<typeof nodeSeveritySchema>

export const isoDateTimeSchema = z.iso.datetime({ offset: true })
const isoDateTime = isoDateTimeSchema

/** Persisted timeline record. Field names match the JSON export format. */
export const timelineSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  description: z.string(),
  orientation: orientationSchema,
  created_at: isoDateTime,
  updated_at: isoDateTime,
})
export type Timeline = z.infer<typeof timelineSchema>

/** Persisted node record. Field names match the JSON export format. */
export const timelineNodeSchema = z.object({
  id: z.uuid(),
  timeline_id: z.uuid(),
  title: z.string().min(1),
  description: z.string(),
  color: nodeColorSchema.nullable(),
  layer: nodeLayerSchema,
  severity: nodeSeveritySchema,
  position: z.int().nonnegative(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
})
export type TimelineNode = z.infer<typeof timelineNodeSchema>

/** User-entered title: trimmed, required. */
export const titleSchema = z.string().trim().min(1, 'Title is required')
const titleInput = titleSchema

const timelineFields = z.object({
  title: titleInput,
  description: z.string(),
  orientation: orientationSchema,
})

const nodeFields = z.object({
  title: titleInput,
  description: z.string(),
  color: nodeColorSchema.nullable(),
  layer: nodeLayerSchema,
  severity: nodeSeveritySchema,
})

/** User-editable timeline fields for creation (forms, repository input). */
export const timelineInputSchema = timelineFields.extend({
  description: timelineFields.shape.description.default(''),
  orientation: timelineFields.shape.orientation.default('vertical'),
})
export type TimelineInput = z.input<typeof timelineInputSchema>

/** Timeline form: every editable field present, no defaults. */
export const timelineFormSchema = timelineFields
export type TimelineFormInput = z.input<typeof timelineFormSchema>
export type TimelineFormValues = z.output<typeof timelineFormSchema>

/** Partial timeline update. No defaults, so absent fields stay unchanged. */
export const timelineChangesSchema = timelineFields.partial()
export type TimelineChanges = z.input<typeof timelineChangesSchema>

/** User-editable node fields for creation (forms, repository input). */
export const nodeInputSchema = nodeFields.extend({
  description: nodeFields.shape.description.default(''),
  color: nodeFields.shape.color.default(null),
  layer: nodeFields.shape.layer.default(DEFAULT_NODE_LAYER),
  severity: nodeFields.shape.severity.default(DEFAULT_NODE_SEVERITY),
})
export type NodeInput = z.input<typeof nodeInputSchema>

/** Node form: every editable field present, no defaults. */
export const nodeFormSchema = nodeFields
export type NodeFormInput = z.input<typeof nodeFormSchema>
export type NodeFormValues = z.output<typeof nodeFormSchema>

/** Partial node update. No defaults, so absent fields stay unchanged. */
export const nodeChangesSchema = nodeFields.partial()
export type NodeChanges = z.input<typeof nodeChangesSchema>
