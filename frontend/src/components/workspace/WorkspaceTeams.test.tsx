import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { WorkspaceTeams } from './WorkspaceTeams'
import type { Team } from '@/data/team'
import type { WorkspaceSummary } from '@/types'

let mockTeams: Team[] = []
const mockUseTeams = jest.fn()
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockDelete = { mutate: jest.fn() }
const mockAdd = { mutate: jest.fn(), isPending: false }
const mockRemove = { mutate: jest.fn() }

jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null | undefined) => role === 'admin' || role === 'owner',
}))
jest.mock('@/api/teams', () => ({
  useTeams: (...args: unknown[]) => { mockUseTeams(...args); return { data: mockTeams } },
  useCreateTeam: () => mockCreate,
  useUpdateTeam: () => mockUpdate,
  useDeleteTeam: () => mockDelete,
  useAddTeamMember: () => mockAdd,
  useRemoveTeamMember: () => mockRemove,
}))

const person = (id: number, name: string) => ({ id: id * 10, user_id: id, user: { id, name, email: `${name.toLowerCase()}@example.com` } })
const team = (id: number, name: string, role: Team['role'], members: Team['members'] = []): Team => ({ id, workspace_id: 5, name, role, members })
const space = (role: WorkspaceSummary['role'], personal = false): WorkspaceSummary => ({ id: 5, name: 'Studio', personal, role })

beforeEach(() => {
  mockTeams = [team(2, 'writers', 'viewer'), team(1, 'Design', 'member', [person(7, 'Ada'), person(8, 'Bo')])]
})
afterEach(() => jest.clearAllMocks())

test('lists the teams by name with their role, help text and people', () => {
  render(<WorkspaceTeams workspace={space('member')} open onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Teams in Studio' })).toBeInTheDocument()
  const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
  expect(names).toEqual(['Design', 'writers'])
  expect(screen.getByText('2 people')).toBeInTheDocument()
  expect(screen.getByText('No one yet')).toBeInTheDocument()
  expect(screen.getByText('Can also create, edit and delete content.')).toBeInTheDocument()
  expect(screen.getByText('Ada')).toBeInTheDocument()
  expect(screen.getByText('bo@example.com')).toBeInTheDocument()
})

test('a plain member can read but not change anything', () => {
  render(<WorkspaceTeams workspace={space('member')} open onClose={jest.fn()} />)
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Delete|Rename|Remove|Create team|Add/ })).not.toBeInTheDocument()
  expect(screen.getByText('viewer')).toBeInTheDocument()
})

test('shows a message when the Space has no teams', () => {
  mockTeams = []
  render(<WorkspaceTeams workspace={space('member')} open onClose={jest.fn()} />)
  expect(screen.getByText('No teams yet.')).toBeInTheDocument()
})

test('only fetches the teams while the dialog is open', () => {
  const { rerender } = render(<WorkspaceTeams workspace={space('owner')} open={false} onClose={jest.fn()} />)
  expect(mockUseTeams).toHaveBeenLastCalledWith(5, false)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  rerender(<WorkspaceTeams workspace={space('owner')} open onClose={jest.fn()} />)
  expect(mockUseTeams).toHaveBeenLastCalledWith(5, true)
})

test('an admin creates a team with a role', () => {
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'New team name' }), { target: { value: '  Product   leads ' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Role for the new team' }), { target: { value: 'admin' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create team' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Product leads', role: 'admin' }, expect.anything())
})

test('a team name that already exists cannot be created', () => {
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'New team name' }), { target: { value: 'design' } })
  expect(screen.getByRole('alert')).toHaveTextContent('A team with that name already exists.')
  expect(screen.getByRole('button', { name: 'Create team' })).toBeDisabled()
  fireEvent.submit(screen.getByRole('textbox', { name: 'New team name' }))
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})

test('an admin changes a team role', () => {
  render(<WorkspaceTeams workspace={space('owner')} open onClose={jest.fn()} />)
  const select = screen.getByRole('combobox', { name: 'Role of Design' })
  expect(Array.from((select as HTMLSelectElement).options).map((o) => o.value)).toEqual(['viewer', 'member', 'admin'])
  fireEvent.change(select, { target: { value: 'admin' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, role: 'admin' })
})

test('an admin adds a person by email and removes another', () => {
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Email to add to Design' }), { target: { value: ' cy@example.com ' } })
  fireEvent.click(within(screen.getByRole('textbox', { name: 'Email to add to Design' }).closest('form')!).getByRole('button', { name: 'Add' }))
  expect(mockAdd.mutate).toHaveBeenCalledWith({ teamId: 1, email: 'cy@example.com' }, expect.anything())

  fireEvent.click(screen.getByRole('button', { name: 'Remove Bo from Design' }))
  expect(mockRemove.mutate).toHaveBeenCalledWith({ teamId: 1, membershipId: 80 })
})

test('an admin renames a team', () => {
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Rename Design' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Team name' }), { target: { value: 'Product design' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, name: 'Product design' })
})

test('deleting a team asks first', () => {
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete writers' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  expect(screen.getByText(/Everyone on this team loses the access it gave them/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Delete team' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(2)
})

test('a personal Space offers no way to make teams', () => {
  render(<WorkspaceTeams workspace={space('owner', true)} open onClose={jest.fn()} />)
  expect(screen.queryByRole('button', { name: 'Create team' })).not.toBeInTheDocument()
})
