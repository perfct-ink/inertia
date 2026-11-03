import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { WorkspaceTeams } from './WorkspaceTeams'
import { useAuthStore } from '@/store/auth'
import type { Team } from '@/data/team'
import type { WorkspaceMember, WorkspaceSummary } from '@/types'

let mockTeams: Team[] = []
let mockMembers: Partial<WorkspaceMember>[] = []
let mockSpaces: WorkspaceSummary[] = []
const mockUseTeams = jest.fn()
const mockLeave = { mutate: jest.fn(), isPending: false }
const mockSwitch = jest.fn()
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockDelete = { mutate: jest.fn() }
const mockAdd = { mutate: jest.fn(), isPending: false }
const mockRemove = { mutate: jest.fn() }

jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null | undefined) => role === 'admin' || role === 'owner',
  useWorkspaces: () => ({ data: mockSpaces }),
}))
jest.mock('@/api/workspaceMembers', () => ({
  useWorkspaceMembers: () => ({ data: mockMembers }),
}))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useSwitchWorkspace: () => mockSwitch }))
jest.mock('@/api/teams', () => ({
  useTeams: (...args: unknown[]) => { mockUseTeams(...args); return { data: mockTeams } },
  useCreateTeam: () => mockCreate,
  useUpdateTeam: () => mockUpdate,
  useDeleteTeam: () => mockDelete,
  useAddTeamMember: () => mockAdd,
  useRemoveTeamMember: () => mockRemove,
  useLeaveTeam: () => mockLeave,
}))

const person = (id: number, name: string) => ({ id: id * 10, user_id: id, user: { id, name, email: `${name.toLowerCase()}@example.com` } })
const team = (id: number, name: string, role: Team['role'], members: Team['members'] = []): Team => ({ id, workspace_id: 5, name, role, members })
const space = (role: WorkspaceSummary['role'], personal = false): WorkspaceSummary => ({ id: 5, name: 'Studio', personal, role })

beforeEach(() => {
  mockTeams = [team(2, 'writers', 'viewer'), team(1, 'Design', 'member', [person(7, 'Ada'), person(8, 'Bo')])]
  mockMembers = []
  mockSpaces = [{ id: 9, name: 'My Space', personal: true, role: 'owner' }, space('member')]
  useAuthStore.setState({ token: 't', user: { id: 7, name: 'Ada', email: 'ada@example.com' } })
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

test('a team the signed-in user is not on has no Leave action', () => {
  useAuthStore.setState({ user: { id: 99, name: 'Zed', email: 'zed@example.com' } })
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  expect(screen.queryByRole('button', { name: /Leave team/ })).not.toBeInTheDocument()
})

test('a member leaves a team they are on after confirming, without a Space switch when other access stays', () => {
  mockMembers = [{ id: 1, user_id: 7, role: 'viewer' }]
  const onClose = jest.fn()
  render(<WorkspaceTeams workspace={space('member')} open onClose={onClose} />)
  expect(screen.getAllByRole('button', { name: /Leave team/ })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Leave team Design' }))
  expect(mockLeave.mutate).not.toHaveBeenCalled()
  expect(screen.getByText(/Access you have through your own membership or other teams stays/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Leave team', hidden: false }))
  expect(mockLeave.mutate).toHaveBeenCalledWith({ teamId: 1, membershipId: 70, endsAccess: false }, expect.anything())
  mockLeave.mutate.mock.calls[0][1].onSuccess()
  expect(onClose).not.toHaveBeenCalled()
  expect(mockSwitch).not.toHaveBeenCalled()
})

test('leaving the only team into the Space warns, then closes the dialog and switches to the personal Space', () => {
  const onClose = jest.fn()
  render(<WorkspaceTeams workspace={space('member')} open onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Leave team Design' }))
  expect(screen.getByText(/is your only way into Studio, so you will leave the Space too/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Leave team', hidden: false }))
  expect(mockLeave.mutate).toHaveBeenCalledWith({ teamId: 1, membershipId: 70, endsAccess: true }, expect.anything())
  mockLeave.mutate.mock.calls[0][1].onSuccess()
  expect(onClose).toHaveBeenCalled()
  expect(mockSwitch).toHaveBeenCalledWith(expect.objectContaining({ id: 9, personal: true }))
})

test('a second team keeps the Space, so leaving one does not end access', () => {
  mockTeams = [team(1, 'Design', 'member', [person(7, 'Ada')]), team(2, 'writers', 'viewer', [person(7, 'Ada')])]
  render(<WorkspaceTeams workspace={space('member')} open onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Leave team Design' }))
  fireEvent.click(screen.getByRole('button', { name: 'Leave team', hidden: false }))
  expect(mockLeave.mutate).toHaveBeenCalledWith({ teamId: 1, membershipId: 70, endsAccess: false }, expect.anything())
})

test('an admin gets Leave instead of Remove on their own row but can still remove others', () => {
  render(<WorkspaceTeams workspace={space('admin')} open onClose={jest.fn()} />)
  expect(screen.queryByRole('button', { name: 'Remove Ada from Design' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Bo from Design' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Leave team Design' })).toBeInTheDocument()
})
