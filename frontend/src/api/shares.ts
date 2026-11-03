import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SharedDocument, SharedFolder, SharedPage, SharedRoadmap, ShareLink, ShareTarget } from '@/data/share'
import { ApiResource, useApiMutation, useResourceDelete, useResourceList } from './base'

// Share links for documents and folders (docs/features/shared_links.md). The
// Space's writers list, make and turn off links; a link's holder reads what it
// shares through the two public calls at the bottom, with no sign-in.

// `expires_in_days` of '' means the link works until it is turned off.
export interface NewShare { expires_in_days: string }

const targetParams = ({ kind, id }: ShareTarget) => (kind === 'folder' ? { folder_id: id } : { document_id: id })

export class ShareApi extends ApiResource<ShareLink, never, never> {
  constructor() {
    super('/api/v1/shares', 'share', 'shares')
  }

  createFor(target: ShareTarget, data: NewShare) {
    return api.post<ShareLink>(this.path, { ...targetParams(target), share: { permission: 'view', ...data } }).then((r) => r.data)
  }
}

export const shareApi = new ShareApi()

export const useShares = (target: ShareTarget) => useResourceList(shareApi, { params: targetParams(target), staleTime: 0 })

export const useCreateShare = (target: ShareTarget) =>
  useApiMutation((data: NewShare) => shareApi.createFor(target, data), ['shares'])

export const useDeleteShare = () => useResourceDelete(shareApi)

// The public pages. A bad link is explained on the page itself, so these
// requests don't also raise the app-wide error notice (`silent`).
export type SharedLinkPage =
  | (SharedPage<{ document: SharedDocument }> & { kind: 'document' })
  | (SharedPage<SharedFolder> & { kind: 'folder' })
  | (SharedPage<{ roadmap: SharedRoadmap }> & { kind: 'roadmap' })

export function useSharedLink(token: string) {
  return useQuery<SharedLinkPage>({
    queryKey: ['shared', token],
    queryFn: () => api.get(`/api/v1/shared/${token}`, { silent: true }).then((r) => r.data),
    retry: false,
  })
}

export function useSharedDocument(token: string, documentId: number | null) {
  return useQuery<SharedPage<{ document: SharedDocument }>>({
    queryKey: ['shared', token, 'documents', documentId],
    queryFn: () => api.get(`/api/v1/shared/${token}/documents/${documentId}`, { silent: true }).then((r) => r.data),
    enabled: documentId !== null,
    retry: false,
  })
}
