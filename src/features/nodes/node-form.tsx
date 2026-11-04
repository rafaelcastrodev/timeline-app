import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { MarkdownEditor } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  nodeFormSchema,
  type NodeFormInput,
  type NodeFormValues,
  type TimelineNode,
} from '@/types/models'

const emptyValues: NodeFormInput = { title: '', description: '' }

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
}

export function NodeForm({
  defaultValues = emptyValues,
  submitLabel,
  autoFocusTitle = false,
  onSubmit,
  onSaved,
  onCancel,
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
