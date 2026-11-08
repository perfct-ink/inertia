import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DependencyMode, Folder, FolderContents, FolderKind, ProjectStatus, ProjectTypeKey } from '@/types'
import type { ProjectStart } from '@/data/projectType'
import { ApiResource, useApiMutation } from './base'

export interface FolderFields {
  name?: string
  pinned?: boolean
  parent_id?: number
  archived?: boolean
  kind?: FolderKind
  dependency_mode?: DependencyMode
  icon?: string | null
  image_url?: string | null
  home_document_id?: number | null
  owner_id?: number | null
  project_status?: ProjectStatus
  project_type?: ProjectTypeKey
  start_date?: string | null
  target_date?: string | null
  description?: string | null
}

export interface NewFolder {
  name: string
  parent_id?: number
  kind?: FolderKind
  project_type?: ProjectTypeKey
}

export class FolderApi extends ApiResource<Folder, NewFolder, FolderFields> {
  constructor() {
    super('/api/v1/folders', 'folder', 'folders')
  }

  // A folder plus its documents/tasks/events/epics, scoped to it and every
  // subfolder nested underneath.
  contents(id: number) {
    return api.get<FolderContents>(`${this.url(id)}/contents`).then((r) => r.data)
  }

  // A new project of a type. A built-in type sends its template along (the
  // documents, Collections and tasks it starts with); a saved one is looked up
  // by its key on the server. Nothing is created if any part fails.
  createProject(name: string, { template, ...start }: ProjectStart) {
    return api.post<Folder>(this.path, { folder: { name, kind: 'project', ...start }, ...(template && { template }) }).then((r) => r.data)
  }
}

export const folderApi = new FolderApi()

export const useCreateFolder = () => useApiMutation((data: NewFolder) => folderApi.create(data), ['workspace'])
// Starting a project fills it with the type's documents and tasks, so those lists are refetched too.
export const useCreateProject = () =>
  useApiMutation(({ name, start }: { name: string; start: ProjectStart }) => folderApi.createProject(name, start), ['workspace', 'tasks'])
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
