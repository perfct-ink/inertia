import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FolderMembers } from './FolderMembers'
import type { FolderMember } from '@/types'

let mockMembers: FolderMember[] = []
const mockUseFolderMembers = jest.fn()
const mockInvite = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockRemove = { mutate: jest.fn() }

jest.mock('@/store/auth', () => ({
  useAuthStore: (select: (s: { user: { id: number } }) => unknown) => select({ user: { id: 1 } }),
}))
jest.mock('@/api/folderMembers', () => ({
  useFolderMembers: (...args: unknown[]) => { mockUseFolderMembers(...args); return { data: mockMembers } },
  useInviteToFolder: () => mockInvite,
  useUpdateFolderMemberRole: () => mockUpdate,
  useRemoveFolderMember: () => mockRemove,
}))

const member = (id: number, name: string, role: FolderMember['role'], extra: Partial<FolderMember> = {}): FolderMember => ({
  id, role, user_id: id, folder_id: 5, folder_name: 'Launch', inherited: false, invited_by: 'Sam',
  created_at: '2026-11-02T00:00:00Z', user: { id, name, email: `${name.toLowerCase()}@example.com` }, ...extra,
})
const folder = { id: 5, name: 'Launch' }

beforeEach(() => {
  mockMembers = [member(2, 'Bo', 'viewer'), member(3, 'Cy', 'editor', { inherited: true, folder_name: 'Studio' })]
})
afterEach(() => jest.clearAllMocks())

test('lists who has access, with a role control only for people invited to this folder', () => {
  render(<FolderMembers folder={folder} open onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Share Launch' })).toBeInTheDocument()
  expect(mockUseFolderMembers).toHaveBeenCalledWith(5, true)
  expect(screen.getByRole('combobox', { name: 'Role for Bo' })).toHaveValue('viewer')
  expect(screen.queryByRole('combobox', { name: 'Role for Cy' })).not.toBeInTheDocument()
  expect(screen.getByText('Editor')).toBeInTheDocument()
  expect(screen.getByText('Invited to Studio, which contains this folder')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Cy' })).not.toBeInTheDocument()
})

test('changes a role and removes a person', () => {
  render(<FolderMembers folder={folder} open onClose={jest.fn()} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Role for Bo' }), { target: { value: 'editor' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, role: 'editor' })
  fireEvent.click(screen.getByRole('button', { name: 'Remove Bo' }))
  expect(mockRemove.mutate).toHaveBeenCalledWith(2)
})

test('your own row cannot change its role', () => {
  mockMembers = [member(1, 'Me', 'owner')]
  render(<FolderMembers folder={folder} open onClose={jest.fn()} />)
  expect(screen.getByText('Me (you)')).toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: 'Role for Me' })).not.toBeInTheDocument()
})

test('invites by email as a viewer unless another role is picked, and says what the role allows', () => {
  render(<FolderMembers folder={folder} open onClose={jest.fn()} />)
  const invite = screen.getByRole('button', { name: 'Invite' })
  expect(invite).toBeDisabled()
  expect(screen.getByText('Can open everything in the folder.')).toBeInTheDocument()

  fireEvent.change(screen.getByRole('textbox', { name: 'Email of an existing user' }), { target: { value: ' ann@example.com ' } })
  fireEvent.click(invite)
  expect(mockInvite.mutate).toHaveBeenCalledWith({ email: 'ann@example.com', role: 'viewer' }, expect.anything())

  const roles = screen.getByRole('combobox', { name: 'Role for the new person' })
  fireEvent.change(roles, { target: { value: 'owner' } })
  expect(screen.getByText('Can also invite people to the folder and change their roles.')).toBeInTheDocument()
  expect(within(roles).getAllByRole('option').map((o) => o.textContent)).toEqual(['Viewer', 'Commenter', 'Editor', 'Owner'])
})

test('shows no list when nobody has been invited yet', () => {
  mockMembers = []
  render(<FolderMembers folder={folder} open onClose={jest.fn()} />)
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Email of an existing user' })).toBeInTheDocument()
})

test('does not ask the server for the people while closed', () => {
  render(<FolderMembers folder={folder} open={false} onClose={jest.fn()} />)
  expect(mockUseFolderMembers).toHaveBeenCalledWith(5, false)
})
