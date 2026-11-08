import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { ApiResource, useApiMutation } from './base'

// One key of the imported objects. data_type is the guess, or the type of the
// existing Collection field the key matches (field_id and field_name say which).
export interface ImportColumn {
  key: string
  data_type: string
  field_id: number | null
  field_name: string | null
  importable: boolean
}

// What an import would do: the keys with their guessed types, the keys left out
// (nested values), and the types a new field can be given (the server decides).
export interface ImportPreview {
  row_count: number
  columns: ImportColumn[]
  skipped_keys: string[]
  types: string[]
}

// Where to import: a new Collection in `folder_id`, or `document_id` to append to.
export interface ImportRequest {
  text: string
  folder_id?: number
  document_id?: number
  title?: string
  columns?: { key: string; data_type: string }[]
}

export interface ImportResult { id: number; row_count: number }

// Errors are shown inside the import dialog, so the client's notice is off.
export class CollectionImportApi extends ApiResource<ImportResult, ImportRequest> {
  constructor() {
    super('/api/v1/collection_imports', null, 'collection_imports')
  }

  // Guesses the fields from the text so their types can be changed first.
  preview(data: ImportRequest) {
    return api.post<ImportPreview>(`${this.path}/preview`, data, { silent: true }).then((r) => r.data)
  }

  run(data: ImportRequest) {
    return api.post<ImportResult>(this.path, data, { silent: true }).then((r) => r.data)
  }
}

export const collectionImportApi = new CollectionImportApi()

export const usePreviewImport = () => useMutation({ mutationFn: (data: ImportRequest) => collectionImportApi.preview(data) })

// A new Collection shows in the sidebar and folder lists; appended records show in the open one.
export const useRunImport = () => useApiMutation((data: ImportRequest) => collectionImportApi.run(data), ['workspace', 'folder-contents', 'table'])
