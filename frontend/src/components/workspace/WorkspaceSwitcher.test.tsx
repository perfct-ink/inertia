import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

let mockRole: string
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { id: 1, name: 'Acme', personal: false, role: mockRole, folders: [] } }) }))
jest.mock('@/api/workspaces', () => ({
  useWorkspaces: () => ({ data: [{ id: 1, name: 'Acme', personal: false, role: mockRole }] }),
  useCreateWorkspace: () => ({ mutate: jest.fn() }),
  canManageWorkspace: () => true,
}))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useSwitchWorkspace: () => jest.fn() }))
jest.mock('./WorkspaceMembers', () => ({ WorkspaceMembers: () => null }))
jest.mock('./WorkspaceTeams', () => ({ WorkspaceTeams: () => null }))
jest.mock('./WorkspaceAgentAccess', () => ({
  WorkspaceAgentAccess: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Agent access" /> : null),
}))

function openMenu() {
  render(<WorkspaceSwitcher />)
  fireEvent.click(screen.getByRole('button', { name: /Switch Space/ }))
}

test('an owner can open Agent access from the Space menu', () => {
  mockRole = 'owner'
  openMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Agent access...' }))
  expect(screen.getByRole('dialog', { name: 'Agent access' })).toBeInTheDocument()
})

test.each(['admin', 'member', 'viewer'])('a %s gets no Agent access item', (role) => {
  mockRole = role
  openMenu()
  expect(screen.getByRole('menuitem', { name: 'Members...' })).toBeInTheDocument()
  expect(screen.queryByRole('menuitem', { name: 'Agent access...' })).not.toBeInTheDocument()
})
