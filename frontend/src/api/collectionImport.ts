import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DataType } from '@/api/tables'

export interface ImportField { name: string; data_type: DataType }
export interface ImportPreview { fields: ImportField[]; row_count: number; skipped_keys: string[] }

// Guesses the fields from pasted JSON or YAML so their types can be changed first.
export function usePreviewImport() {
  return useMutation({
    mutationFn: (text: string) => api.post('/api/v1/collection_imports/preview', { text }).then((r) => r.data as ImportPreview),
  })
}

// Creates a collection in `folderId` (or appends to `documentId`) from the same text.
export function useImportCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { text: string; fields: ImportField[]; folderId?: number; title?: string; documentId?: number }) => {
      const { folderId, documentId, ...rest } = data
      return api.post('/api/v1/collection_imports', { ...rest, folder_id: folderId, document_id: documentId }).then((r) => r.data as { id: number; row_count: number })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['folder-contents'] })
    },
  })
}
