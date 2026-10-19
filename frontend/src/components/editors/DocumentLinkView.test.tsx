import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import type { NodeViewProps } from '@tiptap/react'
import DocumentLinkView from './DocumentLinkView'

jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, as: Tag = 'div', className }: { children: ReactNode; as?: string; className?: string }) => {
    const Wrapper = Tag as 'span'
    return <Wrapper className={className}>{children}</Wrapper>
  },
}))
jest.mock('react-router-dom', () => ({ useHref: (to: string) => to }))
jest.mock('@/components/DocTypeIcon', () => function IconMock({ type }: { type: string }) { return <i data-testid="icon">{type}</i> })

const mockWorkspace: { data?: unknown } = {}
jest.mock('@/api/workspace', () => ({ useWorkspace: () => mockWorkspace }))

const spaceWith = (title: string) => ({ folders: [{ id: 1, name: 'Root', root: true, children: [], documents: [{ id: 7, title, doc_type: 'spreadsheet' }] }] })
const view = (documentId: number | null) => <DocumentLinkView {...({ node: { attrs: { documentId } } } as unknown as NodeViewProps)} />

test('shows the target\'s current title and opens it, following a rename', () => {
  mockWorkspace.data = spaceWith('Budget')
  const { rerender } = render(view(7))
  const link = screen.getByRole('link', { name: /Budget/ })
  expect(link).toHaveAttribute('href', '/documents/7')
  expect(screen.getByTestId('icon')).toHaveTextContent('spreadsheet')

  mockWorkspace.data = spaceWith('Budget 2027')
  rerender(view(7))
  expect(screen.getByRole('link', { name: /Budget 2027/ })).toBeInTheDocument()
})

test('says so when the document is gone, and while the Space loads', () => {
  mockWorkspace.data = spaceWith('Budget')
  const { rerender } = render(view(99))
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.getByText('Document not found')).toBeInTheDocument()

  mockWorkspace.data = undefined
  rerender(view(7))
  expect(screen.getByText('Loading…')).toBeInTheDocument()
})
