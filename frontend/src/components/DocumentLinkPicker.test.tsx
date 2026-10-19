import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentLinkPicker from './DocumentLinkPicker'

jest.mock('@/components/DocTypeIcon', () => function IconMock() { return null })

const mockWorkspace: { data?: unknown; isError: boolean; isLoading: boolean } = { isError: false, isLoading: false }
const tree = { folders: [{ id: 1, name: 'Root', root: true, kind: 'folder', children: [
  { id: 2, name: 'Album', kind: 'project', children: [], documents: [
    { id: 11, title: 'Song A', doc_type: 'document', updated_at: '2026-10-09T00:00:00Z', content_updated_at: null },
    { id: 12, title: 'Budget', doc_type: 'spreadsheet', updated_at: '2026-10-05T00:00:00Z', content_updated_at: null },
  ] },
], documents: [{ id: 10, title: 'Notes', doc_type: 'document', updated_at: '2026-10-01T00:00:00Z', content_updated_at: null }] }] }
jest.mock('@/api/workspace', () => ({ useWorkspace: () => mockWorkspace }))

beforeEach(() => Object.assign(mockWorkspace, { data: tree, isError: false, isLoading: false }))

test('lists files with the newest first, skips the current document, narrows by search, and picks by click or Enter', () => {
  const onPick = jest.fn()
  render(<DocumentLinkPicker open excludeId={10} onPick={onPick} onClose={jest.fn()} />)
  expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Song A|Budget|Notes/ }).map((b) => b.textContent)).toEqual(['Song AAlbum', 'BudgetAlbum'])

  const search = screen.getByLabelText('Search documents')
  fireEvent.change(search, { target: { value: 'budget' } })
  expect(screen.queryByText('Song A')).not.toBeInTheDocument()
  fireEvent.keyDown(search, { key: 'Enter' })
  expect(onPick).toHaveBeenCalledWith(12)

  fireEvent.change(search, { target: { value: 'song' } })
  fireEvent.click(screen.getByRole('button', { name: /Song A/ }))
  expect(onPick).toHaveBeenCalledWith(11)
})

test('says when nothing matches', () => {
  render(<DocumentLinkPicker open onPick={jest.fn()} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Search documents'), { target: { value: 'zzz' } })
  expect(screen.getByText('No matching documents.')).toBeInTheDocument()
})

test('shows an error when the Space cannot be loaded, and a status while it loads', () => {
  Object.assign(mockWorkspace, { data: undefined, isError: true })
  const { unmount } = render(<DocumentLinkPicker open onPick={jest.fn()} onClose={jest.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load')
  unmount()

  Object.assign(mockWorkspace, { isError: false, isLoading: true })
  render(<DocumentLinkPicker open onPick={jest.fn()} onClose={jest.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading documents')
  expect(screen.queryByText('No matching documents.')).not.toBeInTheDocument()
})
