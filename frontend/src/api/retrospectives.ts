import api from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Retrospective, RetrospectiveBoard, RetroTemplateKey } from '@/data/retrospective'
import { ApiResource, useResourceCreate, useResourceList, useResourceUpdate } from './base'

type RetrospectiveCreate = { title: string; template?: RetroTemplateKey; sprint_id?: number | null }
// The template is fixed when a board is created.
type RetrospectiveUpdate = { title?: string; sprint_id?: number | null }

// How often an open board refetches, so cards teammates add show up.
const BOARD_REFRESH_MS = 10_000

export class RetrospectiveApi extends ApiResource<Retrospective, RetrospectiveCreate, RetrospectiveUpdate> {
  constructor() {
    super('/api/v1/retrospectives', 'retrospective', 'retrospectives')
  }

  // The board: the retrospective with all its cards.
  board(id: number) {
    return api.get<RetrospectiveBoard>(this.url(id)).then((r) => r.data)
  }
}

export const retrospectiveApi = new RetrospectiveApi()

// Card changes (retroCards.ts) refetch these, since a card count shows on the list too.
export const useRetrospectives = () => useResourceList(retrospectiveApi, { staleTime: 0 })
export const useCreateRetrospective = () => useResourceCreate(retrospectiveApi)
export const useUpdateRetrospective = () => useResourceUpdate(retrospectiveApi)

// The deleted board's own query is dropped rather than refetched, which would
// answer 404 and show an error for a delete that worked.
export function useDeleteRetrospective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => retrospectiveApi.destroy(id),
    onSuccess: (_result, id) => {
      qc.removeQueries({ queryKey: [retrospectiveApi.queryKey, id] })
      qc.invalidateQueries({ queryKey: [retrospectiveApi.queryKey], exact: true })
    },
  })
}

export function useRetrospectiveBoard(id: number) {
  return useQuery<RetrospectiveBoard>({
    queryKey: [retrospectiveApi.queryKey, id],
    queryFn: () => retrospectiveApi.board(id),
    enabled: !!id,
    staleTime: 0,
    // Stops once the board can't be loaded (e.g. deleted by someone else).
    refetchInterval: (query) => (query.state.status === 'error' ? false : BOARD_REFRESH_MS),
  })
}
