import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Breadcrumb from './Breadcrumb'

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: {
      name: 'Acme',
      folders: [{ id: 1, name: 'Root', root: true, children: [{ id: 2, name: 'Messages', children: [{ id: 3, name: 'Design', children: [] }] }] }],
    },
  }),
}))

test('links the Space and each folder, and names the document as the current page', () => {
  render(<Breadcrumb folderId={3} title="Mockups" />)
  expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/space')
  expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/folders/2')
  expect(screen.getByRole('link', { name: 'Design' })).toHaveAttribute('href', '/folders/3')
  expect(screen.getByText('Mockups')).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByText('Root')).not.toBeInTheDocument()
})

test('a document directly in Root shows only the Space and the document', () => {
  render(<Breadcrumb folderId={1} title="Notes" />)
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})
