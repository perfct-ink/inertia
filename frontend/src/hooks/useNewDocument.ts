import { useNavigate } from 'react-router-dom'
import { useCreateDocument, useWorkspace } from '@/api/workspace'
import { untitledTitle } from '@/data/document'
import type { DocumentTemplate } from '@/data/documentTemplate'
import type { Document } from '@/types'

// Creates an untitled document of a type (in a folder, else the Space's Root)
// (or a document filled from a template) and opens it. Throws when it can't, so callers can show the error.
export function useNewDocument() {
  const navigate = useNavigate()
  const { data: workspace } = useWorkspace()
  const create = useCreateDocument()
  return async (type: Document['doc_type'], folderId?: number, template?: DocumentTemplate) => {
    const target = folderId ?? workspace?.root_folder_id ?? workspace?.folders?.[0]?.id
    if (!target) throw new Error('The space root is unavailable. Please try again.')
    const doc = await create.mutateAsync({ folderId: target, ...(template ? { title: template.title, content: template.content } : { title: untitledTitle(type) }), doc_type: type })
    navigate(`/documents/${doc.id}`)
  }
}
