import { keepPreviousData, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { markTouched } from '@/store/untouchedDocuments'
import api from '@/lib/api'
import type { Document, DocumentLinkTarget, FeatureRow } from '@/types'
import { ApiResource, useApiMutation, useResourceFind } from './base'
import { useTabsStore } from '@/store/tabs'

export interface DocumentFields {
  title?: string
  content?: Record<string, unknown>
  pinned?: boolean
  folder_id?: number
  initiative_id?: number | null
  parent_feature_id?: number | null
  feature_status?: Document['feature_status']
  feature_owner_id?: number | null
  epic_id?: number | null
  milestone_id?: number | null
}

export class DocumentApi extends ApiResource<Document, never, DocumentFields> {
  constructor() {
    super('/api/v1/documents', 'document', 'document')
  }

  // Documents are created inside a folder.
  createIn(folderId: number, data: { title: string; doc_type?: Document['doc_type']; content?: Record<string, unknown> }) {
    return api.post<Document>(`/api/v1/folders/${folderId}/documents`, this.body(data)).then((r) => r.data)
  }

  // Which of these documents exist, with their headings, in one request.
  linkTargets(ids: number[]) {
    return api.get<DocumentLinkTarget[]>(`${this.path}/link_targets`, { params: { ids: ids.join(',') } }).then((r) => r.data)
  }
}

export const documentApi = new DocumentApi()

export const useDocument = (id: number) => useResourceFind(documentApi, id)

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: DocumentFields & { id: number }) => documentApi.update(id, data),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['folder-features'] })
      qc.invalidateQueries({ queryKey: ['initiatives'] })
      qc.setQueryData(['document', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['workspace'] })
      // A rename from anywhere (the sidebar, an editor's title) renames its open tab.
      markTouched(doc.id)
      useTabsStore.getState().updateTitle(String(doc.id), doc.title)
    },
  })
}

export const useCreateDocument = () =>
  useApiMutation(({ folderId, ...data }: { folderId: number; title: string; doc_type?: Document['doc_type']; content?: Record<string, unknown> }) => documentApi.createIn(folderId, data), ['workspace', 'folder-contents'])
export const useDeleteDocument = () => useApiMutation((id: number) => documentApi.destroy(id), ['workspace', 'document-link-targets'])
export const usePinDocument = () =>
  useApiMutation(({ id, pinned }: { id: number; pinned: boolean }) => documentApi.update(id, { pinned }), ['workspace'])
export const useMoveDocument = () =>
  useApiMutation(({ id, folderId }: { id: number; folderId: number }) => documentApi.update(id, { folder_id: folderId }), ['workspace'])

// Whether the documents a document links to still exist, and their headings, for
// marking broken links (docs/features/heading_links.md). One request for all the
// links, repeated only when the set of linked documents changes. `asked` is what
// the answer covers: a document asked about and missing from `found` was deleted.
export function useDocumentLinkTargets(ids: number[]) {
  return useQuery({
    queryKey: ['document-link-targets', ids.join(',')],
    queryFn: async () => ({ asked: ids, found: await documentApi.linkTargets(ids) }),
    enabled: ids.length > 0,
    staleTime: 30_000,
    // While a new set loads, keep the last answer so marked links do not flicker.
    placeholderData: keepPreviousData,
  })
}

export function useFolderFeatures(folderId: number) {
  return useQuery<FeatureRow[]>({
    queryKey: ['folder-features', folderId],
    queryFn: () => api.get(`/api/v1/folders/${folderId}/features`).then((r) => r.data),
    enabled: !!folderId,
    staleTime: 0,
  })
}
