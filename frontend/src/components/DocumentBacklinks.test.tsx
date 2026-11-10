import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import DocumentBacklinks from './DocumentBacklinks'

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
jest.mock('@/components/DocTypeIcon', () => function IconMock() { return null })

let mockDocs: unknown[]
jest.mock('@/api/documents', () => ({ useBacklinks: () => ({ data: mockDocs }) }))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: { folders: [{ id: 1, name: 'Root', root: true, children: [{ id: 2, name: 'Album', children: [] }] }] },
  }),
}))

test('lists the linking documents, each a link with where it lives', () => {
  mockDocs = [{ id: 4, title: 'Plan', doc_type: 'document', folder_id: 2 }, { id: 5, title: 'Notes', doc_type: 'document', folder_id: 1 }]
  render(<DocumentBacklinks documentId={1} />)
  expect(screen.getByRole('heading', { name: /Linked from 2 documents/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Plan/ })).toHaveAttribute('href', '/documents/4')
  expect(screen.getByRole('link', { name: /Plan/ })).toHaveTextContent('Album')
  expect(screen.getByRole('link', { name: /Notes/ })).toHaveAttribute('href', '/documents/5')
})

test('uses the singular for one and shows nothing for none', () => {
  mockDocs = [{ id: 4, title: 'Plan', doc_type: 'document', folder_id: 2 }]
  const { unmount } = render(<DocumentBacklinks documentId={1} />)
  expect(screen.getByRole('heading')).toHaveTextContent(/Linked from 1 document$/)
  unmount()
  mockDocs = []
  const { container } = render(<DocumentBacklinks documentId={1} />)
  expect(container).toBeEmptyDOMElement()
})

test('on a screen that scrolls inside (a sheet, a Collection) the panel is a strip of its own', () => {
  mockDocs = [{ id: 4, title: 'Plan', doc_type: 'document', folder_id: 2 }]
  const { rerender } = render(<DocumentBacklinks documentId={1} />)
  expect(screen.getByRole('region', { name: 'Linked from' })).not.toHaveClass('document_backlinks--bar')
  rerender(<DocumentBacklinks documentId={1} bar />)
  expect(screen.getByRole('region', { name: 'Linked from' })).toHaveClass('document_backlinks', 'document_backlinks--bar')
})
