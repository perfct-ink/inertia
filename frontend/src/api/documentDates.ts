import api from '@/lib/api'
import type { DocumentDate } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceFind, useResourceList, useResourceUpdate } from './base'

type DocumentDateInput = { date: string; label?: string; document_id?: number | null }

export class DocumentDateApi extends ApiResource<DocumentDate, DocumentDateInput, Partial<DocumentDateInput>> {
  constructor() {
    super('/api/v1/document_dates', 'document_date', 'document_dates')
  }

  // A chip in a document loads its own date and shows what went wrong itself
  // ("Deleted date"), so a missing date doesn't also raise an error notice.
  find(id: number) {
    return api.get<DocumentDate>(this.url(id), { silent: true }).then((r) => r.data)
  }
}

export const documentDateApi = new DocumentDateApi()

// `params` narrows the list, e.g. { document_id } for the dates of one document.
export const useDocumentDates = (params?: { document_id?: number }) => useResourceList(documentDateApi, { params })
export const useDocumentDate = (id: number) => useResourceFind(documentDateApi, id)
export const useCreateDocumentDate = () => useResourceCreate(documentDateApi)
export const useUpdateDocumentDate = () => useResourceUpdate(documentDateApi)
export const useDeleteDocumentDate = () => useResourceDelete(documentDateApi)
