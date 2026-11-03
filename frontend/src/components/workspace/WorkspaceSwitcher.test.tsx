import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useSwitchWorkspace: () => jest.fn() }))
jest.mock('./WorkspaceMembers', () => ({ WorkspaceMembers: () => null }))
jest.mock('./WorkspaceTeams', () => ({ WorkspaceTeams: () => null }))

let mockRole = 'admin'
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: { id: 1, name: 'Team', personal: false, role: mockRole, folders: [] } }),
}))
jest.mock('@/api/workspaces', () => ({
  useWorkspaces: () => ({ data: [{ id: 1, name: 'Team', personal: false, role: mockRole }] }),
  useCreateWorkspace: () => ({ mutate: jest.fn() }),
}))

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Space: Team. Switch Space' }))

beforeEach(() => {
  jest.clearAllMocks()
  mockRole = 'admin'
})

test('the Space menu opens the automations page', () => {
  render(<WorkspaceSwitcher />)
  openMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Automations' }))
  expect(mockNavigate).toHaveBeenCalledWith('/automations')
})

test('a member sees the automations entry and a viewer does not', () => {
  mockRole = 'member'
  const { unmount } = render(<WorkspaceSwitcher />)
  openMenu()
  expect(screen.getByRole('menuitem', { name: 'Automations' })).toBeInTheDocument()
  unmount()

  mockRole = 'viewer'
  render(<WorkspaceSwitcher />)
  openMenu()
  expect(screen.queryByRole('menuitem', { name: 'Automations' })).not.toBeInTheDocument()
  expect(screen.getByRole('menuitem', { name: 'Members...' })).toBeInTheDocument()
})
