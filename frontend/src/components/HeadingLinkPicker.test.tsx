import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import HeadingLinkPicker from './HeadingLinkPicker'

const heading = (text: string, attrs: Record<string, unknown> = {}) => ({
  type: 'heading', attrs: { level: 2, ...attrs }, content: [{ type: 'text', text }],
})
const contentWith = (...headings: unknown[]) => ({ type: 'doc', content: [heading('Title', { level: 1 }), ...headings] })

const mockUseDocument = jest.fn()

jest.mock('@/components/DocTypeIcon', () => function IconMock() { return null })
jest.mock('@/api/documents', () => ({ useDocument: (id: number) => mockUseDocument(id) }))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: {
      folders: [{ id: 1, name: 'Root', root: true, kind: 'folder', children: [
        { id: 2, name: 'Album', kind: 'project', children: [], documents: [
          { id: 11, title: 'Song A', doc_type: 'document' },
          { id: 12, title: 'Budget', doc_type: 'spreadsheet' },
        ] },
      ], documents: [{ id: 10, title: 'Notes', doc_type: 'document' }] }],
    },
  }),
}))

beforeEach(() => mockUseDocument.mockReturnValue({ data: undefined, isLoading: false, isError: false }))
afterEach(() => jest.clearAllMocks())

function renderPicker(props: Partial<React.ComponentProps<typeof HeadingLinkPicker>> = {}) {
  const onPick = jest.fn()
  render(
    <HeadingLinkPicker
      open
      currentDocumentId={10}
      currentContent={contentWith(heading('Goals'), heading('Risks', { level: 3 }))}
      onPick={onPick}
      onClose={jest.fn()}
      {...props}
    />,
  )
  return onPick
}

test('lists documents only, the one being edited first, and narrows by search', () => {
  renderPicker({ currentDocumentId: 11 })
  const items = screen.getAllByRole('button', { name: /Notes|Song A|Budget/ })
  expect(items.map((b) => b.textContent)).toEqual(['Song AThis document', 'Notes'])
  expect(screen.queryByText('Budget')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Search documents'), { target: { value: 'zzz' } })
  expect(screen.getByText('No matching documents.')).toBeInTheDocument()
})

test('picks a heading in the document being edited from the live content', () => {
  const onPick = renderPicker()
  fireEvent.click(screen.getByRole('button', { name: /Notes/ }))
  expect(mockUseDocument).toHaveBeenCalledWith(0) // nothing to fetch for the open document
  expect(screen.queryByText('Title')).not.toBeInTheDocument() // the title is the document itself
  fireEvent.click(screen.getByRole('button', { name: 'Risks' }))
  expect(onPick).toHaveBeenCalledWith({ documentId: 10, anchor: 'risks', text: 'Risks' })
})

test('Enter in the search opens the first match, and Back returns to the search', () => {
  renderPicker()
  fireEvent.keyDown(screen.getByLabelText('Search documents'), { key: 'Enter' })
  expect(screen.getByRole('button', { name: 'Goals' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Back/ }))
  expect(screen.getByLabelText('Search documents')).toBeInTheDocument()
})

test('fetches the headings of another document and keeps a stored id as the anchor', () => {
  mockUseDocument.mockReturnValue({
    data: { id: 11, content: contentWith(heading('Verse one', { id: 'v1' })) }, isLoading: false, isError: false,
  })
  const onPick = renderPicker()
  fireEvent.click(screen.getByRole('button', { name: /Song A/ }))
  expect(mockUseDocument).toHaveBeenCalledWith(11)
  fireEvent.click(screen.getByRole('button', { name: 'Verse one' }))
  expect(onPick).toHaveBeenCalledWith({ documentId: 11, anchor: 'v1', text: 'Verse one' })
})

test('says when a document has no headings, is loading, or could not be loaded', () => {
  mockUseDocument.mockReturnValue({ data: { id: 11, content: contentWith() }, isLoading: false, isError: false })
  renderPicker()
  fireEvent.click(screen.getByRole('button', { name: /Song A/ }))
  expect(screen.getByText('This document has no headings to link to yet.')).toBeInTheDocument()

  mockUseDocument.mockReturnValue({ data: undefined, isLoading: true, isError: false })
  fireEvent.click(screen.getByRole('button', { name: /Back/ }))
  fireEvent.click(screen.getByRole('button', { name: /Song A/ }))
  expect(screen.getByRole('status')).toHaveTextContent('Loading headings')

  mockUseDocument.mockReturnValue({ data: undefined, isLoading: false, isError: true })
  fireEvent.click(screen.getByRole('button', { name: /Back/ }))
  fireEvent.click(screen.getByRole('button', { name: /Song A/ }))
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load this document.')
})

test('the dialog is titled "Link to a heading" unless told otherwise', () => {
  renderPicker()
  expect(screen.getByText('Link to a heading')).toBeInTheDocument()
})

test('fixing a broken link gives the dialog its own title', () => {
  renderPicker({ title: 'Pick a new target' })
  expect(screen.getByText('Pick a new target')).toBeInTheDocument()
  expect(screen.queryByText('Link to a heading')).not.toBeInTheDocument()
})
