import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import ParagraphStylePicker from './ParagraphStylePicker'

let mockStyles: unknown[] = []
jest.mock('@/api/paragraphStyles', () => ({ useParagraphStyles: () => ({ data: mockStyles }) }))
// The form is tested on its own; here it only shows what it was opened with.
jest.mock('@/components/CustomStyleDialog', () => function DialogMock({ open, initial, onCreated, onClose }: {
  open: boolean
  initial: unknown
  onCreated: (style: unknown) => void
  onClose: () => void
}) {
  return open ? (
    <div role="dialog" aria-label="New paragraph style">
      <p data-testid="initial">{JSON.stringify(initial)}</p>
      <button onClick={() => onCreated({ id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } })}>Save it</button>
      <button onClick={onClose}>Close it</button>
    </div>
  ) : null
})

// `known` are the custom styles the editor has been told about (its registry).
function fakeEditor(parent: { type: { name: string }; attrs: Record<string, unknown> }, known: { id: number }[] = []) {
  const calls: string[] = []
  const attributes: Record<string, unknown>[] = []
  const setCustomStyles = jest.fn()
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    focus: () => chain,
    setHeading: (arg) => { calls.push(`heading:${(arg as { level: number }).level}`); return chain },
    setParagraph: () => { calls.push('paragraph'); return chain },
    updateAttributes: (_type, attrs) => { calls.push(`style:${(attrs as { style: string }).style}`); attributes.push(attrs as Record<string, unknown>); return chain },
    run: () => true,
  }
  const editor = {
    state: { selection: { $from: { parent } } },
    on: jest.fn(), off: jest.fn(),
    chain: () => chain,
    commands: { setCustomStyles },
    storage: { customParagraphStyle: { styles: new Map(known.map((style) => [style.id, style])) } },
  } as unknown as Editor
  return { editor, calls, attributes, setCustomStyles }
}

beforeEach(() => { mockStyles = [] })

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

const callout = { id: 7, name: 'Callout', base: 'quote', properties: { size: 20, color: '#2563eb' } }

test('the person\'s own styles are listed under My styles, and none shows no group', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  const { unmount } = render(<ParagraphStylePicker editor={editor} />)
  expect(screen.queryByRole('group', { name: 'My styles' })).not.toBeInTheDocument()
  unmount()

  mockStyles = [callout]
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByRole('option', { name: 'Callout' })).toBeInTheDocument()
})

test('choosing one of my styles sets the paragraph to refer to that style, and tells the editor what it is', () => {
  mockStyles = [callout]
  const { editor, calls, attributes, setCustomStyles } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'custom-7' } })
  expect(calls).toEqual(['paragraph', 'style:custom-7'])
  expect(attributes[0]).toEqual({ style: 'custom-7' })
  expect(setCustomStyles).toHaveBeenCalledWith([callout])
})

test('a paragraph in one of my styles shows that style', () => {
  mockStyles = [callout]
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'custom-7' } })
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('custom-7')
})

test('a paragraph in a style this person does not have shows the placeholder', () => {
  mockStyles = [callout]
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'custom-99' } })
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('')
})

test('New style opens the form starting from the paragraph under the cursor', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'custom-7' } }, [{ id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } }])
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  expect(screen.getByRole('dialog', { name: 'New paragraph style' })).toBeInTheDocument()
  expect(JSON.parse(screen.getByTestId('initial').textContent ?? '')).toEqual({ base: 'quote', properties: { size: 20 } })
})

test('New style on a built-in style starts from that style', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'caption' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  expect(JSON.parse(screen.getByTestId('initial').textContent ?? '')).toEqual({ base: 'caption', properties: {} })
})

test('a style made in the form is applied to the paragraph and the form closes', () => {
  const { editor, calls, attributes, setCustomStyles } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save it' }))
  expect(calls).toEqual(['paragraph', 'style:custom-7'])
  expect(attributes[0]).toEqual({ style: 'custom-7' })
  expect(setCustomStyles).toHaveBeenCalledWith([{ id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } }])
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('closing the form changes nothing', () => {
  const { editor, calls } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close it' }))
  expect(calls).toEqual([])
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

const theirs = { id: 9, name: 'Warning', base: 'caption', properties: { color: '#dc2626' } }

test('a style someone else made that this document uses is listed under In this document and can be used', () => {
  mockStyles = [callout]
  const { editor, attributes } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } }, [callout, theirs])
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByRole('option', { name: 'Warning' })).toBeInTheDocument()
  expect(screen.getAllByRole('option', { name: 'Callout' })).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'custom-9' } })
  expect(attributes[0]).toEqual({ style: 'custom-9' })
})

test('a paragraph in someone else\'s style shows that style\'s name', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'custom-9' } }, [theirs])
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('custom-9')
})
