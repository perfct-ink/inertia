import { useQuery } from '@tanstack/react-query'
import type { Baseline } from '@/types'
import { ApiResource, useApiMutation } from './base'

// A folder's saved Gantt baselines. They are listed and made under the folder
// and deleted by their own id (shallow routes).
export class BaselineApi extends ApiResource<Baseline, { name: string }> {
  constructor(folderId: number) {
    super(`/api/v1/folders/${folderId}/baselines`, 'baseline', 'baselines')
  }

  protected url(id: number) {
    return `/api/v1/baselines/${id}`
  }
}

export function useBaselines(folderId: number) {
  return useQuery<Baseline[]>({
    queryKey: ['baselines', folderId],
    queryFn: () => new BaselineApi(folderId).list(),
  })
}

export const useCreateBaseline = (folderId: number) =>
  useApiMutation((name: string) => new BaselineApi(folderId).create({ name }), [['baselines', folderId]])
export const useDeleteBaseline = (folderId: number) =>
  useApiMutation((id: number) => new BaselineApi(folderId).destroy(id), [['baselines', folderId]])
