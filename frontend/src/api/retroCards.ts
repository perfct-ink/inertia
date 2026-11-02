import api from '@/lib/api'
import type { RetroCard } from '@/data/retrospective'
import { ApiResource, useApiMutation, useResourceCreate, useResourceDelete, useResourceUpdate } from './base'

type RetroCardCreate = { retrospective_id: number; column_key: string; body: string }
type RetroCardUpdate = { column_key?: string; body?: string }

export class RetroCardApi extends ApiResource<RetroCard, RetroCardCreate, RetroCardUpdate> {
  constructor() {
    super('/api/v1/retro_cards', 'retro_card', 'retro_cards')
  }

  // One vote per person per card; both calls answer with the card.
  vote(id: number) {
    return api.post<RetroCard>(`${this.url(id)}/vote`).then((r) => r.data)
  }

  unvote(id: number) {
    return api.delete<RetroCard>(`${this.url(id)}/vote`).then((r) => r.data)
  }

  // Turns an action item into a backlog task; answers with the card (now with task_id).
  makeTask(id: number) {
    return api.post<RetroCard>(`${this.url(id)}/task`).then((r) => r.data)
  }
}

export const retroCardApi = new RetroCardApi()

// Cards are listed inside their board, so a change refetches the boards.
export const useCreateRetroCard = () => useResourceCreate(retroCardApi, ['retrospectives'])
export const useUpdateRetroCard = () => useResourceUpdate(retroCardApi, ['retrospectives'])
export const useDeleteRetroCard = () => useResourceDelete(retroCardApi, ['retrospectives'])

// `voted` is the card's current state: true takes the vote back.
export const useToggleRetroVote = () =>
  useApiMutation(({ id, voted }: { id: number; voted: boolean }) => (voted ? retroCardApi.unvote(id) : retroCardApi.vote(id)), ['retrospectives'])

// The new task shows up on the Tasks page too.
export const useMakeRetroTask = () => useApiMutation((id: number) => retroCardApi.makeTask(id), ['retrospectives', 'tasks'])
