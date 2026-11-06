import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import ParagraphStylePicker from './ParagraphStylePicker'

function fakeEditor(parent: { type: { name: string }; attrs: Record<string, unknown> }) {
  const calls: string[] = []
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    focus: () => chain,
    setHeading: (arg) => { calls.push(`heading:${(arg as { level: number }).level}`); return chain },
    setParagraph: () => { calls.push('paragraph'); return chain },
    updateAttributes: (_type, attrs) => { calls.push(`style:${(attrs as { style: string }).style}`); return chain },
    run: () => true,
  }
  const editor = {
    state: { selection: { $from: { parent } } },
    on: jest.fn(), off: jest.fn(),
    chain: () => chain,
  } as unknown as Editor
  return { editor, calls }
}

test('shows the style of the block under the cursor', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'quote' } })
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('quote')
})

test('a block that is not a styled paragraph or heading 1-3 shows a placeholder', () => {
  const { editor } = fakeEditor({ type: { name: 'codeBlock' }, attrs: {} })
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('')
})

test('choosing a heading sets the level; choosing a named style sets a paragraph with that style', () => {
  const { editor, calls } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'heading2' } })
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'caption' } })
  expect(calls).toEqual(['heading:2', 'paragraph', 'style:caption'])
})

test('each style that has a key shows it beside its name in the list, and Caption shows none', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  const { container } = render(<ParagraphStylePicker editor={editor} />)
  fireEvent.click(container.querySelector('.ui-select') as HTMLElement)
  const hints = (name: string) => within(within(screen.getByRole('listbox')).getByRole('option', { name })).queryByText(/[⌘⌥⇧]/)?.textContent
  expect(hints('Title')).toBe('⌘⌥7')
  expect(hints('Heading 1')).toBe('⌘⌥1')
  expect(hints('Body')).toBe('⌘⌥0')
  expect(hints('Monospace')).toBe('⌘⇧M')
  expect(hints('Caption')).toBeUndefined()
})
