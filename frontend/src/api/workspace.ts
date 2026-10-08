import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Workspace, Folder, Document, FolderContents } from '@/types'

// ── Workspace ─────────────────────────────────────────────────────────────────

export function useWorkspace() {
  return useQuery<Workspace>({
    queryKey: ['workspace'],
    queryFn: () => api.get('/api/v1/workspace').then((r) => r.data),
  })
}

// ── Folders ───────────────────────────────────────────────────────────────────

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; parent_id?: number }) =>
      api.post('/api/v1/folders', { folder: data }).then((r) => r.data as Folder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

export function useUpdateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; pinned?: boolean; parent_id?: number; archived?: boolean }) =>
      api.patch(`/api/v1/folders/${id}`, { folder: data }).then((r) => r.data as Folder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['archived-folders'] })
    },
  })
}

// Every archived folder in the workspace, flat regardless of nesting depth
// (an archived subfolder's own active parent wouldn't surface it
// otherwise) — backs the sidebar's "show archived" filter.
export function useArchivedFolders() {
  return useQuery<Folder[]>({
    queryKey: ['archived-folders'],
    queryFn: () => api.get('/api/v1/folders', { params: { archived: '1' } }).then((r) => r.data),
  })
}

// A folder plus its documents/tasks/events/epics, scoped to it and every
// subfolder nested underneath — what the folder detail page renders.
export function useFolderContents(id: number | undefined) {
  return useQuery<FolderContents>({
    queryKey: ['folder-contents', id],
    queryFn: () => api.get(`/api/v1/folders/${id}/contents`).then((r) => r.data),
    enabled: id != null,
  })
}

export function usePinFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) =>
      api.patch(`/api/v1/folders/${id}`, { folder: { pinned } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

export function usePinDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) =>
      api.patch(`/api/v1/documents/${id}`, { document: { pinned } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

export function useMoveDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number }) =>
      api.patch(`/api/v1/documents/${id}`, { document: { folder_id: folderId } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/folders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, ...data }: { folderId: number; title: string; doc_type?: Document['doc_type'] }) =>
      api
        .post(`/api/v1/folders/${folderId}/documents`, { document: data })
        .then((r) => r.data as Document),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['folder-contents'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}
