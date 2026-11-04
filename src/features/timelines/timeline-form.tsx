import { zodResolver } from '@hookform/resolvers/zod'
import { Columns3Icon, Rows3Icon } from 'lucide-react'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { MarkdownEditor } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  orientationSchema,
  timelineFormSchema,
  type Timeline,
  type TimelineFormInput,
  type TimelineFormValues,
} from '@/types/models'

const emptyValues: TimelineFormInput = { title: '', description: '', orientation: 'vertical' }

interface TimelineFormProps {
  defaultValues?: TimelineFormInput
  submitLabel: string
  /** Persists the values. Errors are shown in the form. */
  onSubmit: (values: TimelineFormValues) => Promise<Timeline>
  /** Called after a successful save, once the form is no longer dirty. */
  onSaved: (timeline: Timeline) => void
  onCancel: () => void
}

export function TimelineForm({
  defaultValues = emptyValues,
  submitLabel,
  onSubmit,
  onSaved,
  onCancel,
}: TimelineFormProps) {
  const id = useId()
  const form = useForm({ resolver: zodResolver(timelineFormSchema), defaultValues })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    let saved: Timeline
    try {
      saved = await onSubmit(values)
    } catch {
      form.setError('root', { message: 'Could not save the timeline. Try again.' })
      return
    }
    form.reset(values)
    onSaved(saved)
  })

  return (
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
          name="orientation"
          render={({ field }) => (
            <Field>
              <FieldLabel id={`${id}-orientation`}>Orientation</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                aria-labelledby={`${id}-orientation`}
                value={field.value}
                onValueChange={(value) => {
                  // Radix emits '' when the active item is clicked again; keep a value selected.
                  const parsed = orientationSchema.safeParse(value)
                  if (parsed.success) field.onChange(parsed.data)
                }}
              >
                <ToggleGroupItem value="vertical">
                  <Rows3Icon aria-hidden="true" />
                  Vertical
                </ToggleGroupItem>
                <ToggleGroupItem value="horizontal">
                  <Columns3Icon aria-hidden="true" />
                  Horizontal
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          )}
        />
      </FieldGroup>

      <FieldError errors={[errors.root]} />

      <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
