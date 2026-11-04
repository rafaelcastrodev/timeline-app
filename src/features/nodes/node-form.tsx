import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { MarkdownEditor } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DEFAULT_NODE_LAYER,
  NODE_LAYERS,
  nodeFormSchema,
  type NodeFormInput,
  type NodeColor,
  type NodeFormValues,
  type TimelineNode,
} from '@/types/models'
import { NodeColorPicker } from './node-color-picker'

const emptyValues: NodeFormInput = {
  title: '',
  description: '',
  color: null,
  layer: DEFAULT_NODE_LAYER,
}

interface NodeFormProps {
  defaultValues?: NodeFormInput
  submitLabel: string
  /** Focuses the title on mount (the form replaced the view that had focus). */
  autoFocusTitle?: boolean
  /** Persists the values. Errors are shown in the form. */
  onSubmit: (values: NodeFormValues) => Promise<TimelineNode>
  /** Called after a successful save, once the form is no longer dirty. */
  onSaved: (node: TimelineNode) => void
  /** Called on Cancel, after confirming when there are unsaved changes. */
  onCancel: () => void
  /** Called when the user picks a card color, so the dialog can preview it. */
  onColorChange?: (color: NodeColor | null) => void
}

export function NodeForm({
  defaultValues = emptyValues,
  submitLabel,
  autoFocusTitle = false,
  onSubmit,
  onSaved,
  onCancel,
  onColorChange,
}: NodeFormProps) {
  const id = useId()
  const form = useForm({ resolver: zodResolver(nodeFormSchema), defaultValues })
  const { errors, isDirty, isSubmitting } = form.formState
  const guard = useUnsavedChangesGuard(isDirty)

  const submit = form.handleSubmit(async (values) => {
    let saved: TimelineNode
    try {
      saved = await onSubmit(values)
    } catch {
      form.setError('root', { message: 'Could not save the node. Try again.' })
      return
    }
    form.reset(values)
    guard.bypass(() => onSaved(saved))
  })

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-1 flex-col gap-6"
      >
        <FieldGroup>
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
            <Input
              id={`${id}-title`}
              autoComplete="off"
              autoFocus={autoFocusTitle}
              aria-invalid={!!errors.title}
              {...form.register('title')}
            />
            <FieldDescription>Markdown: bold, italic, code and links.</FieldDescription>
            <FieldError errors={[errors.title]} />
          </Field>

          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
                <MarkdownEditor
                  id={`${id}-description`}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="layer"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={`${id}-layer`}>Layer</FieldLabel>
                <Select
                  name={field.name}
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger
                    id={`${id}-layer`}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-24"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NODE_LAYERS.map((layer) => (
                      <SelectItem key={layer} value={String(layer)}>
                        {layer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  The timeline can focus one layer and dim the others.
                </FieldDescription>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <FieldSet>
                <FieldLegend variant="label">Card color</FieldLegend>
                <NodeColorPicker
                  value={field.value}
                  onChange={(color) => {
                    field.onChange(color)
                    onColorChange?.(color)
                  }}
                  onBlur={field.onBlur}
                />
              </FieldSet>
            )}
          />
        </FieldGroup>

        <FieldError errors={[errors.root]} />

        <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => guard.confirmDiscard(onCancel)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
      {guard.dialog}
    </>
  )
}
