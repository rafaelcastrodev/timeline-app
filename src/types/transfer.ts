import { z } from 'zod'
import {
  DEFAULT_NODE_LAYER,
  DEFAULT_NODE_SEVERITY,
  isoDateTimeSchema,
  nodeColorSchema,
  nodeLayerSchema,
  nodeSeveritySchema,
  orientationSchema,
  titleSchema,
} from './models'

export const TIMELINE_FILE_FORMAT = 'timeline-app'
export const TIMELINE_FILE_SCHEMA_VERSION = 1

/** Timeline metadata in an export file. Unknown fields are stripped. */
const fileTimelineSchema = z.object({
  id: z.uuid(),
  title: titleSchema,
  description: z.string(),
  orientation: orientationSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
})

/**
 * Node in an export file. Import uses the array order, not `position`, for the new order.
 * `color`, `layer` and `severity` are optional (files exported before those fields have none) and
 * default to `null`, `1` and `4`.
 */
const fileNodeSchema = z.object({
  id: z.uuid(),
  title: titleSchema,
  description: z.string(),
  color: nodeColorSchema.nullable().default(null),
  layer: nodeLayerSchema.default(DEFAULT_NODE_LAYER),
  severity: nodeSeveritySchema.default(DEFAULT_NODE_SEVERITY),
  position: z.int().nonnegative(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
})

/** JSON export file, `schema_version` 1: one timeline with its nodes sorted by position. */
export const timelineFileSchema = z.object({
  format: z.literal(TIMELINE_FILE_FORMAT),
  schema_version: z.literal(TIMELINE_FILE_SCHEMA_VERSION),
  exported_at: isoDateTimeSchema,
  timeline: fileTimelineSchema,
  nodes: z.array(fileNodeSchema),
})
export type TimelineFile = z.output<typeof timelineFileSchema>
