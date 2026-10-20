import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Document, FeatureRow } from '@/types'

export function useDocument(id: number) {
  return useQuery<Document>({
    queryKey: ['document', id],
    queryFn: () => api.get(`/api/v1/documents/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; content?: Record<string, unknown>; parent_feature_id?: number | null; feature_status?: Document['feature_status']; feature_owner_id?: number | null; epic_id?: number | null; milestone_id?: number | null }) =>
      api.patch(`/api/v1/documents/${id}`, { document: data }).then((r) => r.data as Document),
    onSuccess: (doc) => {
      qc.setQueryData(['document', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['folder-features'] })
    },
  })
}

// The features under a folder, nested, with rollups.
export function useFolderFeatures(folderId: number) {
  return useQuery<FeatureRow[]>({
    queryKey: ['folder-features', folderId],
    queryFn: () => api.get(`/api/v1/folders/${folderId}/features`).then((r) => r.data),
    enabled: !!folderId,
    staleTime: 0,
  })
}
