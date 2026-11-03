import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AttachedRecords, TransferKind, TransferMode } from '@/data/transfer'
import type { Document, Folder, SpaceFolder } from '@/types'
import { folderApi } from './folders'

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

// What a move or copy of a folder does to the records filed directly under it.
// Read-only and always fresh, because the answer decides what the dialog says.
export function useAttachedRecords(folderId: number | null) {
  return useQuery<AttachedRecords>({
    queryKey: ['folder-attached-records', folderId],
    queryFn: () => folderApi.attachedRecords(folderId as number),
    enabled: folderId != null,
    gcTime: 0,
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
