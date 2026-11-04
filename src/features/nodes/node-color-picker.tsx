import { CheckIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { NODE_COLORS, nodeColorSchema, type NodeColor } from '@/types/models'
import { nodeColorClasses, swatchFillClasses } from './node-colors'

const DEFAULT_VALUE = 'default'

const swatchClasses =
  'size-8 min-w-8 rounded-full p-0 ring-1 ring-foreground/15 data-[state=on]:ring-2 data-[state=on]:ring-foreground data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-background'

interface NodeColorPickerProps {
  value: NodeColor | null
  onChange: (color: NodeColor | null) => void
  onBlur?: () => void
  className?: string
}

/**
 * Single-select swatches (radio semantics): "Default" plus the 500 shade of every card color.
 * Name it with the surrounding fieldset legend.
 */
export function NodeColorPicker({ value, onChange, onBlur, className }: NodeColorPickerProps) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? DEFAULT_VALUE}
      onValueChange={(next) => {
        // Radix emits '' when the active item is clicked again; keep a value selected.
        if (!next) return
        const parsed = nodeColorSchema.safeParse(next)
        onChange(parsed.success ? parsed.data : null)
      }}
      onBlur={onBlur}
      className={cn('flex-wrap', className)}
    >
      <ToggleGroupItem
        value={DEFAULT_VALUE}
        aria-label="Default"
        title="Default"
        className={cn(swatchClasses, 'bg-card hover:bg-card data-[state=on]:bg-card')}
      >
        <CheckIcon
          aria-hidden="true"
          className="hidden text-foreground group-data-[state=on]/toggle:block"
        />
      </ToggleGroupItem>
      {NODE_COLORS.map((color) => {
        const { label, vars } = nodeColorClasses[color]
        return (
          <ToggleGroupItem
            key={color}
            value={color}
            aria-label={label}
            title={label}
            className={cn(swatchClasses, vars, swatchFillClasses, 'hover:opacity-85')}
          >
            <CheckIcon
              aria-hidden="true"
              className="hidden text-neutral-950 group-data-[state=on]/toggle:block"
            />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
