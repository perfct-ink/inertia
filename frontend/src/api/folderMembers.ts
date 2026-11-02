import { useQuery } from '@tanstack/react-query'
import type { FolderMember, FolderRole, SharedFolder } from '@/types'
import { ApiResource, useApiMutation, useResourceList } from './base'

// Role rules are plain data and live in data/folderRole.ts.
export { FOLDER_ROLES, canManageFolder, canWriteFolder } from '@/data/folderRole'

// The people invited to one folder; the API takes the fields as the body itself.
export class FolderMemberApi extends ApiResource<FolderMember, { email: string; role: FolderRole }, { role: FolderRole }> {
  constructor(folderId: number) {
    super(`/api/v1/folders/${folderId}/members`, null, 'folder-members')
  }
}

// The folders other people invited the signed-in user to.
export class SharedFolderApi extends ApiResource<SharedFolder> {
  constructor() {
    super('/api/v1/shared_folders', null, 'shared-folders')
  }
}

export const sharedFolderApi = new SharedFolderApi()

// `enabled` lets a closed dialog skip the request until it is opened.
export function useFolderMembers(folderId: number, enabled = true) {
  return useQuery<FolderMember[]>({
    queryKey: ['folder-members', folderId],
    queryFn: () => new FolderMemberApi(folderId).list(),
    enabled: enabled && !!folderId,
  })
}

export const useInviteToFolder = (folderId: number) =>
  useApiMutation((data: { email: string; role: FolderRole }) => new FolderMemberApi(folderId).create(data), [['folder-members', folderId]])
export const useUpdateFolderMemberRole = (folderId: number) =>
  useApiMutation(({ id, role }: { id: number; role: FolderRole }) => new FolderMemberApi(folderId).update(id, { role }), [['folder-members', folderId]])
export const useRemoveFolderMember = (folderId: number) =>
  useApiMutation((id: number) => new FolderMemberApi(folderId).destroy(id), [['folder-members', folderId]])

// "Shared with me".
export const useSharedFolders = () => useResourceList(sharedFolderApi)

// Leaving a folder removes the user's own invitation, and with it their access.
export const useLeaveFolder = () =>
  useApiMutation(({ folderId, id }: { folderId: number; id: number }) => new FolderMemberApi(folderId).destroy(id), ['shared-folders', 'folder-contents'])
