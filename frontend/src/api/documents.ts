import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markTouched } from '@/store/untouchedDocuments'
import api from '@/lib/api'
import type { Document } from '@/types'
import { ApiResource, useApiMutation, useResourceFind } from './base'
import { useTabsStore } from '@/store/tabs'

export interface DocumentFields {
  title?: string
  content?: Record<string, unknown>
  pinned?: boolean
  folder_id?: number
}

export class DocumentApi extends ApiResource<Document, never, DocumentFields> {
  constructor() {
    super('/api/v1/documents', 'document', 'document')
  }

  // Documents are created inside a folder.
  createIn(folderId: number, data: { title: string; doc_type?: Document['doc_type'] }) {
    return api.post<Document>(`/api/v1/folders/${folderId}/documents`, this.body(data)).then((r) => r.data)
  }
}

export const documentApi = new DocumentApi()

export const useDocument = (id: number) => useResourceFind(documentApi, id)

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: DocumentFields & { id: number }) => documentApi.update(id, data),
    onSuccess: (doc) => {
      qc.setQueryData(['document', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['workspace'] })
      // A rename from anywhere (the sidebar, an editor's title) renames its open tab.
      markTouched(doc.id)
      useTabsStore.getState().updateTitle(String(doc.id), doc.title)
    },
  })
}

export const useCreateDocument = () =>
  useApiMutation(({ folderId, ...data }: { folderId: number; title: string; doc_type?: Document['doc_type'] }) => documentApi.createIn(folderId, data), ['workspace', 'folder-contents'])
export const useDeleteDocument = () => useApiMutation((id: number) => documentApi.destroy(id), ['workspace'])
export const usePinDocument = () =>
  useApiMutation(({ id, pinned }: { id: number; pinned: boolean }) => documentApi.update(id, { pinned }), ['workspace'])
export const useMoveDocument = () =>
  useApiMutation(({ id, folderId }: { id: number; folderId: number }) => documentApi.update(id, { folder_id: folderId }), ['workspace'])
