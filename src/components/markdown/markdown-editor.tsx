import { useState, type ComponentProps } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { MarkdownBlock } from './markdown-block'

type EditorTab = 'write' | 'preview'

interface MarkdownEditorProps extends Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Markdown textarea with "Write" / "Preview" tabs. Controlled (pair with react-hook-form's
 * `Controller`). Textarea props such as `id`, `name`, `onBlur`, `ref` and `aria-*` are forwarded.
 * The textarea stays mounted while previewing, so its undo history and form ref survive.
 */
export function MarkdownEditor({
  value,
  onChange,
  className,
  ...textareaProps
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<EditorTab>('write')

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => setTab(next as EditorTab)}
      className={cn('gap-2', className)}
    >
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" forceMount hidden={tab !== 'write'}>
        <Textarea
          {...textareaProps}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32"
        />
      </TabsContent>
      <TabsContent value="preview" className="min-h-32 rounded-lg border border-input px-2.5 py-2">
        {value.trim() ? (
          <MarkdownBlock>{value}</MarkdownBlock>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing to preview.</p>
        )}
      </TabsContent>
    </Tabs>
  )
}
