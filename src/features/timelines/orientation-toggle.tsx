import { Columns3Icon, Rows3Icon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { orientationSchema, type Orientation } from '@/types/models'

interface OrientationToggleProps {
  value: Orientation
  onChange: (orientation: Orientation) => void
}

/** Icon-only vertical/horizontal switch for the timeline header. */
export function OrientationToggle({ value, onChange }: OrientationToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      aria-label="Orientation"
      value={value}
      onValueChange={(next) => {
        // Radix emits '' when the active item is clicked again; keep a value selected.
        const parsed = orientationSchema.safeParse(next)
        if (parsed.success && parsed.data !== value) onChange(parsed.data)
      }}
    >
      <ToggleGroupItem value="vertical" aria-label="Vertical" title="Vertical">
        <Rows3Icon aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="horizontal" aria-label="Horizontal" title="Horizontal">
        <Columns3Icon aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
