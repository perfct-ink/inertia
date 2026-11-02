import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { TransferKind, TransferMode } from '@/data/transfer'
import type { Document, Folder, SpaceFolder } from '@/types'

// What a move or copy answers: the Space the item is now in, and the item.
export interface TransferResult {
  workspace_id: number
  document?: Document
  folder?: Folder
}

// One Space's active folders, flat, for choosing a destination. Any Space the
// user belongs to, not just the active one.
export function useSpaceFolders(workspaceId: number | null) {
  return useQuery<SpaceFolder[]>({
    queryKey: ['space-folders', workspaceId],
    queryFn: () => api.get(`/api/v1/workspaces/${workspaceId}/folders`).then((r) => r.data),
    enabled: workspaceId != null,
  })
}

// Moves or copies a document or folder into a folder of another Space. The
// caller shows the error (the dialog has its own place for it).
export function useTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mode, kind, id, targetFolderId }: { mode: TransferMode; kind: TransferKind; id: number; targetFolderId: number }) =>
      api
        .post(`/api/v1/${kind === 'folder' ? 'folders' : 'documents'}/${id}/${mode}`, { target_folder_id: targetFolderId }, { silent: true })
        .then((r) => r.data as TransferResult),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['space-folders'] })
      qc.invalidateQueries({ queryKey: ['folder-contents'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
