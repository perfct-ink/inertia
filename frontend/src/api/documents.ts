import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Document } from '@/types'

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
    mutationFn: ({ id, ...data }: { id: number; title?: string; content?: Record<string, unknown> }) =>
      api.patch(`/api/v1/documents/${id}`, { document: data }).then((r) => r.data as Document),
    onSuccess: (doc) => {
      qc.setQueryData(['document', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}

// The documents that link to this one.
export function useBacklinks(id: number) {
  return useQuery<Document[]>({
    queryKey: ['backlinks', id],
    queryFn: () => api.get(`/api/v1/documents/${id}/backlinks`).then((r) => r.data),
    enabled: !!id,
  })
}
