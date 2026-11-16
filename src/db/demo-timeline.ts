import type { Timeline, TimelineNode } from '@/types/models'

type DemoNode = Pick<TimelineNode, 'title' | 'description' | 'color' | 'layer' | 'severity'>

/** Demo content written once, when the database is created (first launch). */
export const DEMO_TIMELINE = {
  title: 'Lorem ipsum demo',
  description: 'Lorem ipsum dolor sit amet, consectetur.',
  orientation: 'vertical',
  nodes: [
    {
      title: 'Laboris ullamco sit',
      description: 'Et laboris ipsum ad quis.',
      color: 'pink',
      layer: 4,
      severity: 7,
    },
    {
      title: 'Eiusmod et',
      description: 'Veniam ipsum laboris minim.',
      color: 'emerald',
      layer: 1,
      severity: 4,
    },
    {
      title: 'Magna do ea consequat',
      description: 'Sit exercitation ex aliqua elit incididunt.',
      color: 'violet',
      layer: 2,
      severity: 4,
    },
    {
      title: 'Enim ad eiusmod',
      description: 'Sed laboris nostrud labore ad.',
      color: 'amber',
      layer: 5,
      severity: 2,
    },
    {
      title: 'Ad enim nisi',
      description: 'Magna magna commodo lorem consequat.',
      color: 'rose',
      layer: 4,
      severity: 4,
    },
    {
      title: 'Nostrud aliquip ea',
      description: 'Minim amet quis incididunt enim.',
      color: 'green',
      layer: 1,
      severity: 3,
    },
    {
      title: 'Adipiscing ex',
      description: 'Ex nostrud ipsum ut nostrud.',
      color: 'indigo',
      layer: 3,
      severity: 1,
    },
    {
      title: 'Minim magna quis enim',
      description: 'Ullamco sed ut dolore sit nostrud lorem.',
      color: 'rose',
      layer: 4,
      severity: 4,
    },
    {
      title: 'Sed ut',
      description: 'Ex ad dolore consectetur adipiscing nisi amet.',
      color: 'red',
      layer: 1,
      severity: 6,
    },
    {
      title: 'Enim adipiscing consectetur adipiscing',
      description: 'Quis nostrud dolore enim elit.',
      color: 'violet',
      layer: 5,
      severity: 4,
    },
    {
      title: 'Dolor quis sed',
      description: 'Ullamco tempor ea ea commodo eiusmod.',
      color: 'purple',
      layer: 5,
      severity: 4,
    },
    {
      title: 'Ut do',
      description: 'Dolore dolore nisi ea et ipsum laboris enim.',
      color: 'red',
      layer: 3,
      severity: 1,
    },
    {
      title: 'Adipiscing consequat sed',
      description: 'Lorem sit enim consequat.',
      color: 'red',
      layer: 2,
      severity: 2,
    },
    {
      title: 'Nostrud ea',
      description: 'Ipsum nisi sed aliqua incididunt.',
      color: 'yellow',
      layer: 5,
      severity: 5,
    },
    {
      title: 'Do exercitation',
      description: 'Consequat commodo elit exercitation.',
      color: 'pink',
      layer: 1,
      severity: 3,
    },
  ],
} as const satisfies Pick<Timeline, 'title' | 'description' | 'orientation'> & {
  nodes: readonly DemoNode[]
}

/** Records for the demo timeline: new ids, every timestamp set to `now`, positions in array order. */
export function demoTimelineRecords(now: string): { timeline: Timeline; nodes: TimelineNode[] } {
  const timeline: Timeline = {
    id: crypto.randomUUID(),
    title: DEMO_TIMELINE.title,
    description: DEMO_TIMELINE.description,
    orientation: DEMO_TIMELINE.orientation,
    created_at: now,
    updated_at: now,
  }
  const nodes = DEMO_TIMELINE.nodes.map((node, position): TimelineNode => ({
    ...node,
    id: crypto.randomUUID(),
    timeline_id: timeline.id,
    position,
    created_at: now,
    updated_at: now,
  }))
  return { timeline, nodes }
}
