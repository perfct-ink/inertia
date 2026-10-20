import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import FeatureRollup from './FeatureRollup'

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
let mockRows: unknown[]
jest.mock('@/api/documents', () => ({ useFolderFeatures: () => ({ data: mockRows }) }))

const row = (id: number, title: string, extra = {}) => ({
  id, title, folder_id: 2, parent_feature_id: null, owner_id: null, owner_name: null, epic_id: null, milestone_id: null,
  depth: 0, tasks_count: 4, done_tasks_count: 3, percent: 75, status: 'active', status_derived: true, ...extra,
})

test('lists each feature with status, owner and progress including sub-features', () => {
  mockRows = [row(1, 'Images', { owner_name: 'Pat' }), row(2, 'Upload', { depth: 1, status: 'done', status_derived: false, tasks_count: 1, done_tasks_count: 1, percent: 100 })]
  render(<FeatureRollup folderId={5} />)
  const images = screen.getByRole('rowheader', { name: 'Images' }).parentElement as HTMLElement
  expect(within(images).getByText('Active (auto)')).toBeInTheDocument()
  expect(within(images).getByText('Pat')).toBeInTheDocument()
  expect(within(images).getByText('3/4 · 75%')).toBeInTheDocument()
  const upload = screen.getByRole('rowheader', { name: 'Upload' }).parentElement as HTMLElement
  expect(within(upload).getByText('Done')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute('href', '/documents/2')
})

test('a folder with no features shows nothing', () => {
  mockRows = []
  const { container } = render(<FeatureRollup folderId={5} />)
  expect(container).toBeEmptyDOMElement()
})
