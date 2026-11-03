import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { WorkspaceMembers } from './WorkspaceMembers'
import type { TeamOnlyMember, WorkspaceMember, WorkspacePerson, WorkspaceSummary } from '@/types'

let mockPeople: WorkspacePerson[] = []
const mockUpdate = { mutate: jest.fn() }
const mockRemove = { mutate: jest.fn() }
const mockAdd = { mutate: jest.fn(), isPending: false }

jest.mock('@/store/auth', () => ({
  useAuthStore: (select: (s: { user: { id: number } }) => unknown) => select({ user: { id: 1 } }),
}))
jest.mock('@/api/workspaces', () => ({
  WORKSPACE_ROLES: ['viewer', 'member', 'admin', 'owner'],
  canManageWorkspace: (role: string | null | undefined) => role === 'admin' || role === 'owner',
}))
jest.mock('@/api/workspaceMembers', () => ({
  useWorkspaceMembers: () => ({ data: mockPeople }),
  useAddMember: () => mockAdd,
  useUpdateMemberRole: () => mockUpdate,
  useRemoveMember: () => mockRemove,
}))

const user = (id: number, name: string) => ({ id, name, email: `${name.toLowerCase()}@example.com` })
const member = (id: number, name: string, role: WorkspaceMember['role']): WorkspaceMember =>
  ({ id: id + 100, role, user_id: id, weekly_capacity_hours: 40, user: user(id, name) })
const teamOnly = (id: number, name: string, role: TeamOnlyMember['role'], ...teams: string[]): TeamOnlyMember =>
  ({ id: null, role, user_id: id, weekly_capacity_hours: 0, user: user(id, name), teams: teams.map((t, i) => ({ id: i + 1, name: t })) })
const space = (role: WorkspaceSummary['role'], personal = false): WorkspaceSummary => ({ id: 5, name: 'Studio', personal, role })

beforeEach(() => {
  mockPeople = [member(1, 'Ada', 'owner'), member(2, 'Ben', 'member'), teamOnly(3, 'Cy', 'admin', 'Design', 'Writers')]
})
afterEach(() => jest.clearAllMocks())

// The row whose name starts with the given one ("Ada (you)" for Ada).
const rowOf = (name: string) => screen.getByText(new RegExp(`^${name}`)).closest('li')!

test('lists a person who is only on a team, read-only, with the teams that give them access', () => {
  render(<WorkspaceMembers workspace={space('owner')} open onClose={jest.fn()} />)
  const row = within(rowOf('Cy'))
  expect(row.getByText('cy@example.com')).toBeInTheDocument()
  expect(row.getByText('admin')).toBeInTheDocument()
  expect(row.getByText('via Design, Writers')).toBeInTheDocument()
  expect(row.queryByRole('combobox')).not.toBeInTheDocument()
  expect(row.queryByRole('button')).not.toBeInTheDocument()
})

test('direct members keep their role select and remove button', () => {
  render(<WorkspaceMembers workspace={space('owner')} open onClose={jest.fn()} />)
  const ben = within(rowOf('Ben'))
  fireEvent.change(ben.getByRole('combobox', { name: 'Role for Ben' }), { target: { value: 'viewer' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 102, role: 'viewer' })
  fireEvent.click(ben.getByRole('button', { name: 'Remove Ben' }))
  expect(mockRemove.mutate).toHaveBeenCalledWith(102, expect.anything())
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
})

test('the "via" label opens the Teams dialog when the caller provides one', () => {
  const onOpenTeams = jest.fn()
  render(<WorkspaceMembers workspace={space('member')} open onClose={jest.fn()} onOpenTeams={onOpenTeams} />)
  fireEvent.click(within(rowOf('Cy')).getByRole('button', { name: 'via Design, Writers' }))
  expect(onOpenTeams).toHaveBeenCalledTimes(1)
})

test('a plain member sees the team-only person too, and the label is text without a Teams dialog to open', () => {
  render(<WorkspaceMembers workspace={space('member')} open onClose={jest.fn()} />)
  expect(within(rowOf('Cy')).getByText('via Design, Writers')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /via/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})

test('marks the signed-in user when they are only on a team, and gives them no leave button', () => {
  mockPeople = [member(2, 'Ben', 'owner'), teamOnly(1, 'Ada', 'member', 'Design')]
  render(<WorkspaceMembers workspace={space('member')} open onClose={jest.fn()} />)
  const row = within(rowOf('Ada'))
  expect(row.getByText('Ada (you)')).toBeInTheDocument()
  expect(row.queryByRole('button')).not.toBeInTheDocument()
})
