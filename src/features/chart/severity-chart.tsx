import { useCallback, useId, type CSSProperties, type KeyboardEvent } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, type DotItemDotProps } from 'recharts'
import { MarkdownInline } from '@/components/markdown'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { focusIdAttribute } from '@/lib/focus'
import { NODE_SEVERITIES } from '@/types/models'
import type { SeverityPoint } from './severity-points'

// No `color` entries: colors come from the theme tokens, so `ChartStyle` injects no stylesheet.
const chartConfig = {
  severity: { label: 'Severity' },
} satisfies ChartConfig

// Recharts compares object and array props by reference: new ones on a re-render (e.g. when a
// node dialog opens over the chart) recompute the layout and recreate the points, which drops
// the focused point. Hence module constants here and stable callbacks below.
const chartMargin = { top: 16, right: 16, bottom: 8, left: 0 }
const severityDomain = [NODE_SEVERITIES[0], NODE_SEVERITIES[4]]
const severityTicks = [...NODE_SEVERITIES]
const xAxisLabel = { value: 'Timeline order', position: 'insideBottom', offset: -4 } as const
const yAxisLabel = { value: 'Severity', angle: -90, position: 'insideLeft', offset: 12 } as const

const tooltipContent = (
  <ChartTooltipContent
    className="max-w-64"
    labelFormatter={(_, payload) => {
      // Recharts types the data item as `any`; the chart data is `SeverityPoint[]`.
      const point = payload[0]?.payload as SeverityPoint | undefined
      return point && <MarkdownInline disableLinks>{point.title}</MarkdownInline>
    }}
  />
)

interface SeverityChartProps {
  /** Keep the array stable between renders (see `chartMargin`). */
  points: SeverityPoint[]
  /** Called when a point is clicked or activated with Enter. Keep it stable between renders. */
  onOpenNode: (nodeId: string) => void
}

/**
 * Line chart of node severity in timeline order: one point per node, joined by a monotone curve
 * (never overshoots 1..5 between points). Each point is a link-like control that opens the node.
 */
export function SeverityChart({ points, onOpenNode }: SeverityChartProps) {
  const labelPrefix = useId()
  const labelId = useCallback(
    (point: SeverityPoint, part: 'title' | 'severity') => `${labelPrefix}-${part}-${point.id}`,
    [labelPrefix],
  )

  const renderDot = useCallback(
    ({ cx, cy, payload }: DotItemDotProps) => {
      if (cx === undefined || cy === undefined) return null
      // Recharts types the data item as `any`; the data passed to the chart is `SeverityPoint[]`.
      const point = payload as SeverityPoint
      const open = () => onOpenNode(point.id)
      return (
        <g
          role="link"
          tabIndex={0}
          aria-labelledby={`${labelId(point, 'title')} ${labelId(point, 'severity')}`}
          {...{ [focusIdAttribute]: `severity-point-${point.id}` }}
          className="group cursor-pointer outline-none"
          onClick={open}
          onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            open()
          }}
        >
          {/* Transparent hit area: 24 px target for touch (WCAG 2.5.8). */}
          <circle cx={cx} cy={cy} r={12} fill="transparent" />
          <circle
            cx={cx}
            cy={cy}
            r={9}
            fill="none"
            strokeWidth={2}
            className="stroke-ring opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
          <circle
            cx={cx}
            cy={cy}
            r={5}
            strokeWidth={2}
            className="fill-background stroke-primary"
          />
        </g>
      )
    },
    [labelId, onOpenNode],
  )

  return (
    <div className="overflow-x-auto">
      {/* Keeps ~3 rem per point, so long timelines scroll instead of packing points together. */}
      <div
        className="min-w-(--chart-min-width)"
        style={{ '--chart-min-width': `${points.length * 3 + 3}rem` } as CSSProperties}
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full lg:h-96 [&_.recharts-label]:fill-muted-foreground"
        >
          <LineChart
            data={points}
            accessibilityLayer={false}
            title="Severity of each node in timeline order"
            margin={chartMargin}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="order"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              label={xAxisLabel}
              height={40}
            />
            <YAxis
              dataKey="severity"
              domain={severityDomain}
              ticks={severityTicks}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={48}
              label={yAxisLabel}
            />
            <ChartTooltip content={tooltipContent} />
            <Line
              dataKey="severity"
              type="monotone"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={renderDot}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Accessible names of the points: titles are Markdown, rendered as text. */}
      <div hidden>
        {points.map((point) => (
          <span key={point.id}>
            <span id={labelId(point, 'title')}>
              <MarkdownInline disableLinks>{point.title}</MarkdownInline>
            </span>
            <span id={labelId(point, 'severity')}>Severity {point.severity}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
