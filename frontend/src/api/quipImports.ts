import { useQuery } from '@tanstack/react-query'
import type { QuipImport } from '@/types'
import { ApiResource, useResourceCreate } from './base'

const RUNNING_STATUSES: QuipImport['status'][] = [ 'pending', 'running' ]

export class QuipImportApi extends ApiResource<QuipImport, { token: string; domain: string }> {
  constructor() {
    super('/api/v1/quip_imports', null, 'quip_imports')
  }
}

export const quipImportApi = new QuipImportApi()

export const useStartQuipImport = () => useResourceCreate(quipImportApi)

// Polls while the import is still pending/running, stops once it settles —
// there's no ActionCable/WebSocket push for this, and polling every 1.5s
// for a bulk, occasional, one-off operation isn't worth adding one for.
export function useQuipImport(id: number | null) {
  return useQuery<QuipImport>({
    queryKey: [ 'quip_imports', id ],
    queryFn: () => quipImportApi.find(id as number),
    enabled: id != null,
    refetchInterval: (query) => (query.state.data && RUNNING_STATUSES.includes(query.state.data.status) ? 1500 : false),
  })
}
