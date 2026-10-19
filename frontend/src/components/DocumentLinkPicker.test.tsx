import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentLinkPicker from './DocumentLinkPicker'

jest.mock('@/components/DocTypeIcon', () => function IconMock() { return null })
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: {
      folders: [{ id: 1, name: 'Root', root: true, kind: 'folder', children: [
        { id: 2, name: 'Album', kind: 'project', children: [], documents: [{ id: 11, title: 'Song A', doc_type: 'document' }, { id: 12, title: 'Budget', doc_type: 'spreadsheet' }] },
      ], documents: [{ id: 10, title: 'Notes', doc_type: 'document' }] }],
    },
  }),
}))

test('lists files, narrows by search, skips the current document, and picks by click or Enter', () => {
  const onPick = jest.fn()
  render(<DocumentLinkPicker open excludeId={10} onPick={onPick} onClose={jest.fn()} />)
  expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  expect(screen.getByText('Song A')).toBeInTheDocument()

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
