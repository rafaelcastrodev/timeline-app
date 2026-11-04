import { LayersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NodeLayer } from '@/types/models'

interface LayerFocusButtonProps {
  /** Layers in use on the timeline, ascending. */
  layers: readonly NodeLayer[]
  value: NodeLayer
  onChange: (layer: NodeLayer) => void
}

/** Header button that moves the focus to the next layer in use, wrapping around. */
export function LayerFocusButton({ layers, value, onChange }: LayerFocusButtonProps) {
  const next = layers[(layers.indexOf(value) + 1) % layers.length] ?? value
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`Focused layer ${value}`}
      title={`Switch to layer ${next}`}
      onClick={() => onChange(next)}
    >
      <LayersIcon aria-hidden="true" />
      {value}
    </Button>
  )
}
