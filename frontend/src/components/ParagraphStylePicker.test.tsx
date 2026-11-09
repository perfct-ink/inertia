import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { useAuthStore } from '@/store/auth'
import { snapshotAttrs } from '@/data/customParagraphStyle'
import ParagraphStylePicker from './ParagraphStylePicker'

let mockStyles: unknown[] = []
jest.mock('@/api/paragraphStyles', () => ({ useParagraphStyles: () => ({ data: mockStyles }) }))
// The forms are tested on their own; here they only show what they were opened with.
jest.mock('@/components/CustomStyleDialog', () => function DialogMock({ open, editing, initial, onSaved, onClose }: {
  open: boolean
  editing?: { id: number; name: string } | null
  initial: unknown
  onSaved: (style: unknown) => void
  onClose: () => void
}) {
  return open ? (
    <div role="dialog" aria-label={editing ? 'Edit paragraph style' : 'New paragraph style'}>
      <p data-testid="initial">{JSON.stringify(initial)}</p>
      <p data-testid="editing">{editing ? editing.name : ''}</p>
      <button onClick={() => onSaved({ id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } })}>Save it</button>
      <button onClick={onClose}>Close it</button>
    </div>
  ) : null
})
jest.mock('@/components/CustomStylesDialog', () => function ManagerMock({ open, styles, onEdit, onClose }: {
  open: boolean
  styles: { id: number; name: string }[]
  onEdit: (style: unknown) => void
  onClose: () => void
}) {
  return open ? (
    <div role="dialog" aria-label="My paragraph styles">
      {styles.map((style) => <button key={style.id} onClick={() => onEdit(style)}>Edit {style.name}</button>)}
      <button onClick={onClose}>Close list</button>
    </div>
  ) : null
})

const callout = { id: 7, name: 'Callout', base: 'quote' as const, properties: { size: 20, color: '#2563eb' } }
const OWNER = 3

function fakeEditor(parent: { type: { name: string }; attrs: Record<string, unknown> }) {
  const calls: string[] = []
  const attributes: Record<string, unknown>[] = []
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
  } as unknown as Editor
  return { editor, calls, attributes }
}

// A paragraph in one of the styles, as the document holds it.
const inStyle = (style: typeof callout, owner = OWNER) => ({ type: { name: 'paragraph' }, attrs: snapshotAttrs(style, owner) as unknown as Record<string, unknown> })

beforeEach(() => {
  mockStyles = []
  useAuthStore.setState({ token: 't', user: { id: OWNER, name: 'Pat', email: 'pat@example.com' } })
})

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

test('choosing a heading sets the level; choosing a named style sets a paragraph with that style and drops any custom copy', () => {
  const { editor, calls, attributes } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'heading2' } })
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'caption' } })
  expect(calls).toEqual(['heading:2', 'paragraph', 'style:caption'])
  expect(attributes[0]).toEqual({ style: 'caption', styleName: null, styleProps: null })
})

test('the person\'s own styles are listed under My styles, and none shows no group or Manage entry', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  const { unmount } = render(<ParagraphStylePicker editor={editor} />)
  expect(screen.queryByRole('group', { name: 'My styles' })).not.toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Manage styles…' })).not.toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'New style…' })).toBeInTheDocument()
  unmount()

  mockStyles = [callout]
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByRole('option', { name: 'Callout' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Manage styles…' })).toBeInTheDocument()
})

test('choosing one of my styles sets the paragraph to that style with a copy of its formatting', () => {
  mockStyles = [callout]
  const { editor, calls, attributes } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'custom-7' } })
  expect(calls).toEqual(['paragraph', 'style:custom-7'])
  expect(attributes[0]).toEqual(snapshotAttrs(callout, OWNER))
  expect(JSON.parse(attributes[0].styleProps as string)).toEqual({ owner: OWNER, base: 'quote', properties: { size: 20, color: '#2563eb' } })
})

test('a paragraph in one of my styles shows that style', () => {
  mockStyles = [callout]
  const { editor } = fakeEditor(inStyle(callout))
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('custom-7')
})

test('a paragraph in a style the person does not have shows the name its copy carries, without listing it under My styles', () => {
  mockStyles = [{ ...callout, id: 8, name: 'Mine' }]
  const { editor } = fakeEditor(inStyle(callout, 99))
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('custom-7')
  expect(screen.getAllByRole('option', { name: 'Callout' })).toHaveLength(1)
  expect(screen.getByRole('group', { name: 'My styles' })).not.toHaveTextContent('Callout')
  expect(screen.getByRole('group', { name: 'My styles' })).toHaveTextContent('Mine')
})

test('a custom paragraph whose copy has no name shows a generic label', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'custom-9' } })
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.getByLabelText('Paragraph style')).toHaveValue('custom-9')
  expect(screen.getByRole('option', { name: 'Custom style' })).toBeInTheDocument()
})

test('New style opens the form starting from the paragraph under the cursor', () => {
  mockStyles = [callout]
  const { editor } = fakeEditor(inStyle(callout))
  render(<ParagraphStylePicker editor={editor} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  expect(screen.getByRole('dialog', { name: 'New paragraph style' })).toBeInTheDocument()
  expect(JSON.parse(screen.getByTestId('initial').textContent ?? '')).toEqual({ base: 'quote', properties: { size: 20, color: '#2563eb' } })
})

test('New style on a built-in style starts from that style', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'caption' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  expect(JSON.parse(screen.getByTestId('initial').textContent ?? '')).toEqual({ base: 'caption', properties: {} })
})

test('a style made in the form is applied to the paragraph and the form closes', () => {
  const { editor, calls, attributes } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'new-style' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save it' }))
  expect(calls).toEqual(['paragraph', 'style:custom-7'])
  expect(attributes[0]).toEqual(snapshotAttrs({ id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } }, OWNER))
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

test('Manage styles lists the person\'s styles; Edit opens the form on that style and saving changes no paragraph', () => {
  mockStyles = [callout]
  const { editor, calls } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'manage-styles' } })
  expect(screen.getByRole('dialog', { name: 'My paragraph styles' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Edit Callout' }))
  expect(screen.queryByRole('dialog', { name: 'My paragraph styles' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'Edit paragraph style' })).toBeInTheDocument()
  expect(screen.getByTestId('editing')).toHaveTextContent('Callout')

  fireEvent.click(screen.getByRole('button', { name: 'Save it' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(calls).toEqual([])
})

test('the Manage list closes without changing anything', () => {
  mockStyles = [callout]
  const { editor, calls } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  render(<ParagraphStylePicker editor={editor} />)
  fireEvent.change(screen.getByLabelText('Paragraph style'), { target: { value: 'manage-styles' } })
  fireEvent.click(screen.getByRole('button', { name: 'Close list' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(calls).toEqual([])
})

test('each style that has a key shows it beside its name in the list, and Caption shows none', () => {
  const { editor } = fakeEditor({ type: { name: 'paragraph' }, attrs: { style: 'body' } })
  const { container } = render(<ParagraphStylePicker editor={editor} />)
  fireEvent.click(container.querySelector('.ui-select') as HTMLElement)
  const hints = (name: string) => within(within(screen.getByRole('listbox')).getByRole('option', { name })).queryByText(/[⌘⌥⇧]/)?.textContent
  expect(hints('Title')).toBe('⌘⌥7')
  expect(hints('Heading 1')).toBe('⌘⌥1')
  expect(hints('Body')).toBe('⌘⌥0')
  expect(hints('Monospace')).toBeUndefined()
  expect(hints('Caption')).toBeUndefined()
})
