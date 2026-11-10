import type { QueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { CustomParagraphStyle, CustomParagraphStyleInput } from '@/data/customParagraphStyle'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

// The signed-in person's own custom paragraph styles. They belong to the person,
// not to a Space, so they are the same in every document (the Space header is
// ignored by the server). The server keeps nothing about which documents use a
// style: each paragraph carries its own copy (data/customParagraphStyle.ts).
export class ParagraphStyleApi extends ApiResource<CustomParagraphStyle, CustomParagraphStyleInput, Partial<CustomParagraphStyleInput>> {
  constructor() {
    super('/api/v1/paragraph_styles', 'paragraph_style', 'paragraph_styles')
  }

  // The form that saves a style shows a refusal (a taken name, say) beside the
  // fields, so the error notice is left to it.
  create(data: CustomParagraphStyleInput) {
    return api.post<CustomParagraphStyle>(this.path, this.body(data), { silent: true }).then((r) => r.data)
  }

  update(id: number, data: Partial<CustomParagraphStyleInput>) {
    return api.patch<CustomParagraphStyle>(this.url(id), this.body(data), { silent: true }).then((r) => r.data)
  }
}

export const paragraphStyleApi = new ParagraphStyleApi()

// Styles change only when this person changes one, so they are kept for a while.
export const useParagraphStyles = () => useResourceList(paragraphStyleApi, { staleTime: 5 * 60_000 })
export const useCreateParagraphStyle = () => useResourceCreate(paragraphStyleApi)
export const useUpdateParagraphStyle = () => useResourceUpdate(paragraphStyleApi)
// Deleting a style deletes its keystroke too (the server does), so that list is refetched.
export const useDeleteParagraphStyle = () => useResourceDelete(paragraphStyleApi, ['paragraph_style_shortcuts'])

// The list straight from the server, whatever is cached, and the cache brought up
// to date with it. Rewriting documents (deleting a style's paragraphs, say) is
// done only on this, never on a possibly stale cached list.
export const fetchParagraphStyles = (queryClient: QueryClient) =>
  queryClient.fetchQuery({ queryKey: [paragraphStyleApi.queryKey], queryFn: () => paragraphStyleApi.list(), staleTime: 0 })
