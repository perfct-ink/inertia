import { useNavigate } from 'react-router-dom'
import { useCreateDocument, useWorkspace } from '@/api/workspace'
import { untitledTitle } from '@/data/document'
import type { Document } from '@/types'

// Creates an untitled document of a type (in a folder, else the Space's Root)
// and opens it. Throws when it can't, so callers can show the error.
export function useNewDocument() {
  const navigate = useNavigate()
  const { data: workspace } = useWorkspace()
  const create = useCreateDocument()
  return async (type: Document['doc_type'], folderId?: number) => {
    const target = folderId ?? workspace?.root_folder_id ?? workspace?.folders?.[0]?.id
    if (!target) throw new Error('The space root is unavailable. Please try again.')
    const doc = await create.mutateAsync({ folderId: target, title: untitledTitle(type), doc_type: type })
    navigate(`/documents/${doc.id}`)
  }
}
