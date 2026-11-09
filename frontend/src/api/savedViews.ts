import { useQuery } from '@tanstack/react-query'
import type { SavedView, SavedViewPage } from '@/data/savedView'
import { ApiResource, useApiMutation } from './base'

interface SavedViewInput {
  name: string
  shared: boolean
  // The page's own choices (each page's data file says what they are).
  config: object
}

export class SavedViewApi extends ApiResource<SavedView, SavedViewInput & { page: SavedViewPage }, Partial<SavedViewInput>> {
  constructor() {
    super('/api/v1/saved_views', 'saved_view', 'saved_views')
  }
}

export const savedViewApi = new SavedViewApi()

// The views a person sees on a page: their own plus the Space's shared ones.
export function useSavedViews(page: SavedViewPage) {
  return useQuery<SavedView[]>({
    queryKey: ['saved_views', page],
    queryFn: () => savedViewApi.list({ page }),
  })
}

export const useCreateSavedView = (page: SavedViewPage) =>
  useApiMutation((data: SavedViewInput) => savedViewApi.create({ page, ...data }), [['saved_views', page]])
export const useUpdateSavedView = (page: SavedViewPage) =>
  useApiMutation(({ id, ...data }: Partial<SavedViewInput> & { id: number }) => savedViewApi.update(id, data), [['saved_views', page]])
export const useDeleteSavedView = (page: SavedViewPage) =>
  useApiMutation((id: number) => savedViewApi.destroy(id), [['saved_views', page]])
