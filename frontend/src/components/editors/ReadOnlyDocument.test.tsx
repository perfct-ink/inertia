import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import ReadOnlyDocument from './ReadOnlyDocument'

const mockUseEditor = jest.fn()
const mockSchema = jest.fn(() => ['schema'])
jest.mock('@tiptap/react', () => ({
  useEditor: (...args: unknown[]) => { mockUseEditor(...args); return { id: 'editor' } },
  EditorContent: ({ className }: { className?: string }) => <div data-testid="editor-content" className={className} />,
}), { virtual: true })
jest.mock('@/extensions/documentSchema', () => ({ documentSchema: (...args: unknown[]) => mockSchema(...(args as [])) }))

afterEach(() => jest.clearAllMocks())

test('builds a read-only editor from the document\'s schema, with the plain task line', () => {
  const content = { type: 'doc', content: [] }
  render(<ReadOnlyDocument content={content} />)
  expect(screen.getByTestId('editor-content')).toHaveClass('read_only_document')
  expect(mockSchema).toHaveBeenCalledWith({ readOnly: true })
  const [options, deps] = mockUseEditor.mock.calls[0]
  expect(options).toMatchObject({ editable: false, content, extensions: ['schema'] })
  expect(deps).toEqual([content])
})

test('says so when the document has no text, instead of showing an empty page', () => {
  render(<ReadOnlyDocument content={{}} />)
  expect(screen.getByText('This document is empty.')).toBeInTheDocument()
  expect(screen.queryByTestId('editor-content')).not.toBeInTheDocument()
})
