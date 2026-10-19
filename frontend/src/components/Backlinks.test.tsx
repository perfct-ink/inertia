import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Backlinks from './Backlinks'

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
let mockDocs: unknown[]
jest.mock('@/api/documents', () => ({ useBacklinks: () => ({ data: mockDocs }) }))

test('lists the linking documents', () => {
  mockDocs = [{ id: 4, title: 'Plan' }, { id: 5, title: 'Notes' }]
  render(<Backlinks documentId={1} />)
  expect(screen.getByText(/Linked from 2 documents/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/documents/4')
})

test('uses the singular for one and shows nothing for none', () => {
  mockDocs = [{ id: 4, title: 'Plan' }]
  const { unmount } = render(<Backlinks documentId={1} />)
  expect(screen.getByText(/Linked from 1 document$/)).toBeInTheDocument()
  unmount()
  mockDocs = []
  const { container } = render(<Backlinks documentId={1} />)
  expect(container).toBeEmptyDOMElement()
})
