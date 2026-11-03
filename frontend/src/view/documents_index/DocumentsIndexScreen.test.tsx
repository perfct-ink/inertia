import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentsIndexScreen from './DocumentsIndexScreen'
import { useTransferStore } from '@/store/transfer'

let mockCanTransfer = true
jest.mock('@/hooks/useTransferTargets', () => ({ useTransferTargets: () => ({ targets: [], canTransfer: mockCanTransfer, isLoading: false }) }))

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/CreateItem', () => function CreateItemMock() { return null })
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }))
jest.mock('@/api/workspaceMembers', () => ({
  useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { id: 7, name: 'Sam' } }, { user_id: 8, user: { id: 8, name: 'Kim' } }] }),
}))
const doc = (id: number, title: string, doc_type: string, created_by_id: number) =>
  ({ id, title, doc_type, created_by_id, updated_at: '2026-10-05T00:00:00Z', content_updated_at: null })
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    isLoading: false,
    data: {
      folders: [{
        id: 1, name: 'Root', root: true, kind: 'folder', documents: [doc(1, 'Loose notes', 'document', 7)],
        children: [{ id: 2, name: 'Album', kind: 'project', documents: [doc(2, 'Budget', 'spreadsheet', 8), doc(3, 'Song', 'document', 8)], children: [] }],
      }],
    },
  }),
}))

const titles = () => screen.getAllByRole('button').map((b) => b.textContent).filter((t) => ['Loose notes', 'Budget', 'Song'].includes(t ?? ''))

test('lists every file, then narrows by project, type and owner', () => {
  render(<DocumentsIndexScreen />)
  expect(titles()).toHaveLength(3)

  fireEvent.change(screen.getByLabelText('Filter by project'), { target: { value: '2' } })
  expect(titles().sort()).toEqual(['Budget', 'Song'])

  fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'spreadsheet' } })
  expect(titles()).toEqual(['Budget'])

  fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Filter by owner'), { target: { value: '8' } })
  expect(titles().sort()).toEqual(['Budget', 'Song'])

  fireEvent.change(screen.getByLabelText('Filter by project'), { target: { value: '0' } })
  expect(screen.getByText('No files match your search.')).toBeInTheDocument()
})

describe('moving or copying to another Space', () => {
  beforeEach(() => {
    mockCanTransfer = true
    useTransferStore.setState({ request: null })
  })

  test('every row has a visible menu that opens the shared dialog for that file', () => {
    render(<DocumentsIndexScreen />)
    expect(screen.getAllByRole('button', { name: /^More actions for / })).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Budget' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy to Space…' }))
    expect(useTransferStore.getState().request).toEqual({ mode: 'copy', kind: 'document', id: 2, name: 'Budget', documentIds: [2] })
  })

  test('there is no menu, and no empty column, when there is no other Space to write in', () => {
    mockCanTransfer = false
    const { container } = render(<DocumentsIndexScreen />)
    expect(screen.queryByRole('button', { name: /^More actions for / })).not.toBeInTheDocument()
    expect(container.querySelector('.documents_index-actions')).toBeNull()
  })
})
