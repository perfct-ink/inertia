import api from '@/lib/api'
import type { CustomParagraphStyle, CustomParagraphStyleInput } from '@/data/customParagraphStyle'
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
