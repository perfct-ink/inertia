import type { Folder, FolderAccess, FolderMember, FolderRole, SharedFolder } from '@/types'
import { flattenFolders } from './folder'

// Roles on a folder shared with named people, least to most privileged.
// Mirrors FolderMembership.roles on the server.
export const FOLDER_ROLES: FolderRole[] = ['viewer', 'commenter', 'editor', 'owner']

export const FOLDER_ROLE_LABEL: Record<FolderRole, string> = {
  viewer: 'Viewer',
  commenter: 'Commenter',
  editor: 'Editor',
  owner: 'Owner',
}

export const FOLDER_ROLE_HELP: Record<FolderRole, string> = {
  viewer: 'Can open everything in the folder.',
  commenter: 'Can open everything in the folder, and comment once comments arrive.',
  editor: 'Can also add, edit and delete documents, files and tasks.',
  owner: 'Can also invite people to the folder and change their roles.',
}

// Editors and owners change what is in the folder; viewers and commenters read.
export const canWriteFolder = (role: FolderRole | null | undefined) => role === 'editor' || role === 'owner'

// Owners invite people, change their roles and remove them.
export const canManageFolder = (role: FolderRole | null | undefined) => role === 'owner'

export interface FolderPermissions {
  // The folder is in another Space and the user got in through an invitation.
  shared: boolean
  canWrite: boolean
  canShare: boolean
}

// What the folder page may offer. A response without `access` (an older
// server) is treated as a Space member who can write and cannot share.
export function folderPermissions(access: FolderAccess | undefined): FolderPermissions {
  if (!access) return { shared: false, canWrite: true, canShare: false }
  return { shared: access.source === 'folder', canWrite: access.can_write, canShare: access.can_share }
}

// The people invited to a folder: those invited here first, then those it
// inherits from folders above, each group by name.
export function sortFolderMembers(members: FolderMember[]): FolderMember[] {
  return [...members].sort((a, b) =>
    Number(a.inherited) - Number(b.inherited) || a.user.name.localeCompare(b.user.name, undefined, { sensitivity: 'base' }))
}

// "Editor, invited by Sam" or just "Editor" when the inviter is gone.
export function roleSummary(role: FolderRole, invitedBy: string | null): string {
  return invitedBy ? `${FOLDER_ROLE_LABEL[role]}, invited by ${invitedBy}` : FOLDER_ROLE_LABEL[role]
}

// The "Shared with me" entry that gives the user a folder: the one whose tree
// holds it (the shared folder itself or anything below it).
export function sharedEntryFor(entries: SharedFolder[], folderId: number): SharedFolder | undefined {
  const holds = (folder: Folder) => flattenFolders([folder]).some((f) => f.id === folderId)
  return entries.find((entry) => holds(entry.folder))
}

// One line for the top of a shared folder's page.
export function sharedNotice(entry: SharedFolder): string {
  const by = entry.invited_by ? `, invited by ${entry.invited_by}` : ''
  return `Shared with you from ${entry.space.name}: ${FOLDER_ROLE_LABEL[entry.role]}${by}.`
}
