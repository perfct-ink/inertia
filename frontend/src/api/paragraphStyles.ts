import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { missingStyleIds, type CustomParagraphStyle, type CustomParagraphStyleInput } from '@/data/customParagraphStyle'
import { ApiResource, useResourceCreate, useResourceList } from './base'

// The signed-in person's own custom paragraph styles. They belong to the person,
// not to a Space, so they are the same in every document (the Space header is
// ignored by the server). Create and list only for now.
export class ParagraphStyleApi extends ApiResource<CustomParagraphStyle, CustomParagraphStyleInput, never> {
  constructor() {
    super('/api/v1/paragraph_styles', 'paragraph_style', 'paragraph_styles')
  }

  // The form that creates a style shows a refusal (a taken name, say) beside the
  // fields, so the error notice is left to it.
  create(data: CustomParagraphStyleInput) {
    return api.post<CustomParagraphStyle>(this.path, this.body(data), { silent: true }).then((r) => r.data)
  }
}

export const paragraphStyleApi = new ParagraphStyleApi()

// Styles change only when this person makes one, so they are kept for a while.
export const useParagraphStyles = () => useResourceList(paragraphStyleApi, { staleTime: 5 * 60_000 })
export const useCreateParagraphStyle = () => useResourceCreate(paragraphStyleApi)

// The custom styles the paragraphs of one document refer to, whoever made them.
// The server answers only for a document the person can open, and only with the
// styles that document uses, so a style stays private to everyone else.
export class DocumentParagraphStyleApi extends ApiResource<CustomParagraphStyle, never, never> {
  constructor(documentId: number) {
    super(`/api/v1/documents/${documentId}/paragraph_styles`, null, 'document_paragraph_styles')
  }
}

const RETRY_MS = 5000
const MAX_RETRIES = 6

// `usedIds` are the styles the open document refers to; `ownIds` those the person
// already has, which need no lookup. A style someone has just applied is on the
// server only once the document has saved, so ids still unknown are asked for again
// every few seconds, a handful of times.
export function useDocumentParagraphStyles(documentId: number, usedIds: number[], ownIds: number[]) {
  const wanted = missingStyleIds(usedIds, ownIds.map((id) => ({ id })))
  return useQuery<CustomParagraphStyle[]>({
    queryKey: ['document_paragraph_styles', documentId, wanted.join(',')],
    queryFn: () => new DocumentParagraphStyleApi(documentId).list(),
    enabled: documentId > 0 && wanted.length > 0,
    refetchInterval: (query) => (missingStyleIds(wanted, query.state.data ?? []).length > 0 && query.state.dataUpdateCount < MAX_RETRIES ? RETRY_MS : false),
  })
}
