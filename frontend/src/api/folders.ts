import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DependencyMode, Folder, FolderContents, FolderKind } from '@/types'
import { ApiResource, useApiMutation } from './base'

export interface FolderFields {
  name?: string
  pinned?: boolean
  parent_id?: number
  archived?: boolean
  kind?: FolderKind
  dependency_mode?: DependencyMode
}

export class FolderApi extends ApiResource<Folder, { name: string; parent_id?: number; kind?: FolderKind }, FolderFields> {
  constructor() {
    super('/api/v1/folders', 'folder', 'folders')
  }

  // A folder plus its documents/tasks/events/epics, scoped to it and every
  // subfolder nested underneath.
  contents(id: number) {
    return api.get<FolderContents>(`${this.url(id)}/contents`).then((r) => r.data)
  }
}

export const folderApi = new FolderApi()

export const useCreateFolder = () => useApiMutation((data: { name: string; parent_id?: number; kind?: FolderKind }) => folderApi.create(data), ['workspace'])
export const useUpdateFolder = () =>
  useApiMutation(({ id, ...data }: FolderFields & { id: number }) => folderApi.update(id, data), ['workspace', 'archived-folders'])
export const usePinFolder = () =>
  useApiMutation(({ id, pinned }: { id: number; pinned: boolean }) => folderApi.update(id, { pinned }), ['workspace'])
export const useDeleteFolder = () => useApiMutation((id: number) => folderApi.destroy(id), ['workspace'])

// Every archived folder in the workspace, flat regardless of nesting depth
// (an archived subfolder's own active parent wouldn't surface it
// otherwise) — backs the sidebar's "show archived" filter.
export function useArchivedFolders() {
  return useQuery<Folder[]>({
    queryKey: ['archived-folders'],
    queryFn: () => folderApi.list({ archived: '1' }),
  })
}

export function useFolderContents(id: number | undefined) {
  return useQuery<FolderContents>({
    queryKey: ['folder-contents', id],
    queryFn: () => folderApi.contents(id as number),
    enabled: id != null,
  })
}
