import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TransferDialog } from './TransferDialog'
import { useTabsStore } from '@/store/tabs'
import type { AttachedRecords, TransferRequest } from '@/data/transfer'
import type { SpaceFolder, WorkspaceSummary } from '@/types'

const mockNavigate = jest.fn()
const mockSwitch = jest.fn()
const mockMutate = jest.fn()
let mockPath = '/documents/7'
let mockTargets: WorkspaceSummary[] = []
let mockFolders: Record<number, SpaceFolder[]> = {}
let mockTransfer: { mutate: jest.Mock; isPending: boolean; isError: boolean; error: unknown }
let mockAttached: { data?: AttachedRecords; isError: boolean }

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: mockPath }) }))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useSwitchWorkspace: () => mockSwitch }))
jest.mock('@/hooks/useTransferTargets', () => ({ useTransferTargets: () => ({ targets: mockTargets, isLoading: false }) }))
jest.mock('@/api/transfer', () => ({
  useSpaceFolders: (id: number | null) => ({ data: id == null ? undefined : mockFolders[id], isLoading: false, isError: false }),
  useAttachedRecords: (id: number | null) => (id == null ? { isError: false } : mockAttached),
  useTransfer: () => mockTransfer,
}))

const space = (id: number, name: string): WorkspaceSummary => ({ id, name, personal: false, role: 'member' })
const folder = (id: number, name: string, parent_id: number | null, root = false): SpaceFolder => ({ id, name, parent_id, position: 0, root })
const request = (overrides: Partial<TransferRequest> = {}): TransferRequest =>
  ({ mode: 'copy', kind: 'document', id: 7, name: 'Plan', documentIds: [7], ...overrides })

beforeEach(() => {
  mockMutate.mockReset()
  mockPath = '/documents/7'
  mockTargets = [space(2, 'Team'), space(3, 'Client')]
  mockFolders = {
    2: [folder(20, 'Root', null, true), folder(21, 'Messages', 20)],
    3: [folder(30, 'Root', null, true), folder(31, 'Briefs', 30)],
  }
  mockTransfer = { mutate: mockMutate, isPending: false, isError: false, error: null }
  mockAttached = { data: { detach: {}, blocked: {} }, isError: false }
  useTabsStore.setState({ tabs: [{ id: '7', path: '/documents/7', title: 'Plan' }, { id: '8', path: '/documents/8', title: 'Other' }], activeId: '8' })
})
afterEach(() => jest.clearAllMocks())

test('explains the action and offers the other Spaces and their folders', () => {
  render(<TransferDialog request={request()} onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Copy to another Space' })).toBeInTheDocument()
  expect(screen.getByText(/The original stays here/)).toBeInTheDocument()
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Team', 'Client', 'Top level', 'Messages'])
  expect((screen.getByLabelText('Folder') as HTMLSelectElement).value).toBe('20')
})

test('copying sends the chosen Space\'s folder and keeps the page open', () => {
  render(<TransferDialog request={request()} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Space'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Folder'), { target: { value: '31' } })
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
  expect(mockMutate).toHaveBeenCalledWith({ mode: 'copy', kind: 'document', id: 7, targetFolderId: 31 }, expect.anything())
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('choosing another Space goes back to its top level', () => {
  render(<TransferDialog request={request()} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Folder'), { target: { value: '21' } })
  fireEvent.change(screen.getByLabelText('Space'), { target: { value: '3' } })
  expect((screen.getByLabelText('Folder') as HTMLSelectElement).value).toBe('30')
})

test('after a copy it can open the copy in the other Space', () => {
  mockMutate.mockImplementation((_vars, options) => options.onSuccess({ workspace_id: 2, document: { id: 70 } }))
  const onClose = jest.fn()
  render(<TransferDialog request={request()} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
  expect(screen.getByText('Copied "Plan" to Team.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Open in Team' }))
  expect(onClose).toHaveBeenCalled()
  expect(mockSwitch).toHaveBeenCalledWith(mockTargets[0])
  expect(mockNavigate).toHaveBeenLastCalledWith('/documents/70')
})

test('after a move the page and tab of the moved document go', () => {
  mockMutate.mockImplementation((_vars, options) => options.onSuccess({ workspace_id: 2, document: { id: 7 } }))
  render(<TransferDialog request={request({ mode: 'move' })} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))
  expect(screen.getByText('Moved "Plan" to Team.')).toBeInTheDocument()
  expect(mockNavigate).toHaveBeenCalledWith('/space')
  expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual(['8'])
  expect(useTabsStore.getState().activeId).toBe('8')
})

test('a move from another page leaves the page alone', () => {
  mockPath = '/tasks'
  mockMutate.mockImplementation((_vars, options) => options.onSuccess({ workspace_id: 2, document: { id: 7 } }))
  render(<TransferDialog request={request({ mode: 'move' })} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('a refused transfer shows why and stays open', () => {
  mockTransfer = {
    ...mockTransfer,
    isError: true,
    error: { isAxiosError: true, message: 'failed', response: { status: 422, data: { errors: ['Choose a folder that is not archived.'] } } },
  }
  render(<TransferDialog request={request()} onClose={jest.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a folder that is not archived.')
  expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled()
})

test('with no other Space to add to it says so', () => {
  mockTargets = []
  render(<TransferDialog request={request()} onClose={jest.fn()} />)
  expect(screen.getByText(/There is no other Space you can add to/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
})

describe('a folder with records filed directly under it', () => {
  const folderRequest = (mode: 'move' | 'copy') => request({ mode, kind: 'folder', id: 3, name: 'Plans', documentIds: [7] })
  const attached = (detach: AttachedRecords['detach'], blocked: AttachedRecords['blocked'] = {}) => ({ data: { detach, blocked }, isError: false })

  test('a move says how many of each kind it detaches and sends on Move', () => {
    mockAttached = attached({ tasks: 2, events: 1 })
    render(<TransferDialog request={folderRequest('move')} onClose={jest.fn()} />)
    expect(screen.getByText(/The move detaches 2 tasks and 1 event filed directly under this folder/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    expect(mockMutate).toHaveBeenCalledWith({ mode: 'move', kind: 'folder', id: 3, targetFolderId: 20 }, expect.anything())
  })

  test('a copy says what it leaves behind, including what a move could not detach', () => {
    mockAttached = attached({ tasks: 2 }, { resource_allocations: 1 })
    render(<TransferDialog request={folderRequest('copy')} onClose={jest.fn()} />)
    expect(screen.getByText(/The copy leaves behind 2 tasks and 1 allocation/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled()
  })

  test('nothing is said when nothing is filed under the folder', () => {
    render(<TransferDialog request={folderRequest('move')} onClose={jest.fn()} />)
    expect(screen.queryByText(/filed directly/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled()
  })

  test('records that cannot be detached stop the move and say why', () => {
    mockAttached = attached({ tasks: 2 }, { resource_allocations: 1 })
    render(<TransferDialog request={folderRequest('move')} onClose={jest.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent("A move can't detach 1 allocation")
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()
  })

  test('a move waits for the count, and says so when it could not be read', () => {
    mockAttached = { data: undefined, isError: true }
    render(<TransferDialog request={folderRequest('move')} onClose={jest.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't check what is filed directly under this folder.")
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()
  })
})
