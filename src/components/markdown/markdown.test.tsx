import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MarkdownBlock, MarkdownEditor, MarkdownExcerpt, MarkdownInline } from '.'

function tagsIn(container: HTMLElement) {
  return [...new Set([...container.querySelectorAll('*')].map((el) => el.tagName.toLowerCase()))]
}

const xssSource = [
  '<script>alert(1)</script>',
  '<img src=x onerror="alert(1)">',
  '<b>bold</b>',
  '[click](javascript:alert(1))',
  '[data](data:text/html;base64,PHNjcmlwdD4=)',
].join('\n\n')

describe.each([
  ['MarkdownInline', MarkdownInline],
  ['MarkdownBlock', MarkdownBlock],
  ['MarkdownExcerpt', MarkdownExcerpt],
])('%s safety', (_name, Component) => {
  it('does not render raw HTML', () => {
    const { container } = render(<Component>{xssSource}</Component>)
    expect(container.querySelector('script, b, img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(container).toHaveTextContent('<b>bold</b>')
  })

  it('neutralizes javascript: and data: links', () => {
    const { container } = render(<Component>{xssSource}</Component>)
    expect(container.querySelector('a')).toBeNull()
    expect(container).toHaveTextContent('click')
    expect(container.innerHTML).not.toMatch(/javascript:|data:text/)
  })
})

describe('MarkdownInline', () => {
  it('keeps only strong, em, del, code and links', () => {
    const source =
      '# **bold** _em_ ~~del~~ `code` [link](https://example.com)\n\n- item\n\n> quote ![alt text](https://example.com/a.png)'
    const { container } = render(<MarkdownInline>{source}</MarkdownInline>)
    expect(tagsIn(container).sort()).toEqual(['a', 'code', 'del', 'em', 'span', 'strong'])
    expect(container).toHaveTextContent('item')
    expect(container).toHaveTextContent('alt text')
  })

  it('opens links in a new tab', () => {
    render(<MarkdownInline>{'[site](https://example.com)'}</MarkdownInline>)
    const link = screen.getByRole('link', { name: 'site' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders links as text when disableLinks is set', () => {
    render(<MarkdownInline disableLinks>{'[site](https://example.com)'}</MarkdownInline>)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('site')).toBeInTheDocument()
  })
})

describe('MarkdownBlock', () => {
  it('renders GFM blocks', () => {
    const source = [
      '## Heading',
      '- [x] done\n- [ ] todo',
      '1. one',
      '| a | b |\n| - | - |\n| 1 | 2 |',
      '```\ncode block\n```',
      '~~gone~~ and www.example.com',
    ].join('\n\n')
    const { container } = render(<MarkdownBlock>{source}</MarkdownBlock>)
    expect(screen.getByRole('heading', { level: 2, name: 'Heading' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
    expect(screen.getAllByRole('checkbox')[0]).toBeDisabled()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelector('ol')).not.toBeNull()
    expect(container.querySelector('pre > code')).toHaveTextContent('code block')
    expect(container.querySelector('del')).toHaveTextContent('gone')
    expect(screen.getByRole('link', { name: 'www.example.com' })).toHaveAttribute(
      'href',
      'http://www.example.com',
    )
  })

  it('opens links in a new tab', () => {
    render(<MarkdownBlock>{'[site](https://example.com)'}</MarkdownBlock>)
    const link = screen.getByRole('link', { name: 'site' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders images with safe URLs', () => {
    render(<MarkdownBlock>{'![alt](https://example.com/a.png)'}</MarkdownBlock>)
    expect(screen.getByRole('img', { name: 'alt' })).toHaveAttribute(
      'src',
      'https://example.com/a.png',
    )
  })
})

describe('MarkdownExcerpt', () => {
  it('renders headings as paragraphs, images as alt text and links as text', () => {
    const source = '# Title\n\n![picture](https://example.com/a.png) [site](https://example.com)'
    const { container } = render(<MarkdownExcerpt>{source}</MarkdownExcerpt>)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(container).toHaveTextContent('Title picture site')
  })

  it('clamps to the requested number of lines', () => {
    const { container, rerender } = render(<MarkdownExcerpt>text</MarkdownExcerpt>)
    const root = container.querySelector('[data-slot="markdown-excerpt"]')
    expect(root).toHaveClass('line-clamp-3')
    rerender(<MarkdownExcerpt lines={2}>text</MarkdownExcerpt>)
    expect(root).toHaveClass('line-clamp-2')
    expect(root).not.toHaveClass('line-clamp-3')
  })
})

describe('MarkdownEditor', () => {
  function Harness({ initial = '' }: { initial?: string }) {
    const [value, setValue] = useState(initial)
    return (
      <>
        <label htmlFor="description">Description</label>
        <MarkdownEditor id="description" value={value} onChange={setValue} />
      </>
    )
  }

  it('edits text and previews it as Markdown', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Description'), '**hello**')
    await user.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(screen.getByText('hello').tagName).toBe('STRONG')
    expect(screen.getByLabelText('Description')).not.toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Write' }))
    expect(screen.getByLabelText('Description')).toHaveValue('**hello**')
    expect(screen.getByLabelText('Description')).toBeVisible()
  })

  it('shows a placeholder when previewing empty text', async () => {
    const user = userEvent.setup()
    render(<Harness initial="   " />)
    await user.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(screen.getByText('Nothing to preview.')).toBeInTheDocument()
  })
})
