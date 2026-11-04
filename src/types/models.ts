import { z } from 'zod'

export const orientationSchema = z.enum(['vertical', 'horizontal'])
export type Orientation = z.infer<typeof orientationSchema>

const isoDateTime = z.iso.datetime({ offset: true })

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
  position: z.int().nonnegative(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
})
export type TimelineNode = z.infer<typeof timelineNodeSchema>

const titleInput = z.string().trim().min(1, 'Title is required')

const timelineFields = z.object({
  title: titleInput,
  description: z.string(),
  orientation: orientationSchema,
})

const nodeFields = z.object({
  title: titleInput,
  description: z.string(),
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
})
export type NodeInput = z.input<typeof nodeInputSchema>

/** Partial node update. No defaults, so absent fields stay unchanged. */
export const nodeChangesSchema = nodeFields.partial()
export type NodeChanges = z.input<typeof nodeChangesSchema>
