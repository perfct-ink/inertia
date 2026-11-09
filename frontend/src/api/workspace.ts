import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useWorkspaceStore } from '@/store/workspaces'
import type { Document, Workspace } from '@/types'

// The singleton resource at /api/v1/workspace: the active workspace
// (X-Workspace-Id) with its folders and documents. The workspaces the user
// belongs to are in workspaces.ts.
export class ActiveWorkspaceApi {
  readonly path = '/api/v1/workspace'
  readonly queryKey = 'workspace'

  // If the stored workspace is gone or the user lost access (404), fall back
  // to their personal workspace.
  find() {
    return api.get<Workspace>(this.path, { silent: true }).then((r) => r.data).catch((error) => {
      const { activeWorkspaceId, setActive } = useWorkspaceStore.getState()
      if (error.response?.status !== 404 || !activeWorkspaceId) throw error
      setActive(null)
      return api.get<Workspace>(this.path).then((r) => r.data)
    })
  }
}

export const activeWorkspaceApi = new ActiveWorkspaceApi()

export function useWorkspace() {
  return useQuery<Workspace>({
    queryKey: [activeWorkspaceApi.queryKey],
    queryFn: () => activeWorkspaceApi.find(),
  })
}

// Uploads files of any type into a folder, each as a file item of its own.
// Refetches even when one fails, so the files that did upload appear.
export function useUploadFiles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ folderId, files }: { folderId: number; files: File[] }) => {
      const created: Document[] = []
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        created.push(await api.post<Document>(`/api/v1/folders/${folderId}/files`, form).then((r) => r.data))
      }
      return created
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['folder-contents'] })
      qc.invalidateQueries({ queryKey: ['shared-folders'] })
    },
  })
}

// Replaces a file item's contents with a new upload.
export function useReplaceFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentId, file }: { documentId: number; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api.put(`/api/v1/documents/${documentId}/file`, form).then((r) => r.data as Document)
    },
    onSuccess: (doc) => {
      qc.setQueryData(['document', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}
