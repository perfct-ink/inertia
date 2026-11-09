import type { FolderMember } from '@/types'
import {
  FOLDER_ROLES, canManageFolder, canWriteFolder, folderPermissions, roleSummary, sortFolderMembers,
} from './folderRole'

const member = (id: number, name: string, inherited: boolean): FolderMember => ({
  id, role: 'viewer', user_id: id, folder_id: 1, folder_name: 'Launch', inherited, invited_by: null,
  created_at: '2026-11-02T00:00:00Z', user: { id, name, email: `${name.toLowerCase()}@example.com` },
})

test('roles run from least to most privileged and only editors and owners write', () => {
  expect(FOLDER_ROLES).toEqual(['viewer', 'commenter', 'editor', 'owner'])
  expect(FOLDER_ROLES.map((role) => canWriteFolder(role))).toEqual([false, false, true, true])
  expect(FOLDER_ROLES.map((role) => canManageFolder(role))).toEqual([false, false, false, true])
  expect([canWriteFolder(null), canManageFolder(undefined)]).toEqual([false, false])
})

test('the folder page offers what the server says the user may do', () => {
  expect(folderPermissions({ source: 'folder', role: 'viewer', can_write: false, can_share: false }))
    .toEqual({ shared: true, canWrite: false, canShare: false })
  expect(folderPermissions({ source: 'space', role: 'admin', can_write: true, can_share: true }))
    .toEqual({ shared: false, canWrite: true, canShare: true })
})

test('a response without access is treated as a Space member who can write but not share', () => {
  expect(folderPermissions(undefined)).toEqual({ shared: false, canWrite: true, canShare: false })
})

test('people invited here come before inherited ones, each group by name', () => {
  const sorted = sortFolderMembers([member(1, 'Zed', false), member(2, 'ann', true), member(3, 'Bo', false), member(4, 'Cy', true)])
  expect(sorted.map((m) => m.user.name)).toEqual(['Bo', 'Zed', 'ann', 'Cy'])
})

test('the role summary names who invited, when known', () => {
  expect(roleSummary('editor', 'Sam')).toBe('Editor, invited by Sam')
  expect(roleSummary('viewer', null)).toBe('Viewer')
})
