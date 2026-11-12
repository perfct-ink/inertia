import { useNavigate } from 'react-router-dom'
import { useCreateDocument } from '@/api/documents'
import { untitledTitle } from '@/data/document'
import { idPath } from '@/data/path'
import { useTargetFolder } from '@/hooks/useTargetFolder'
import { markUntouched } from '@/store/untouchedDocuments'
import type { DocumentTemplate } from '@/data/documentTemplate'
import type { Document } from '@/types'

// Creates an untitled document of a type in a folder and opens it, with the
// cursor in its title. With no folder (no project context) it goes in the
// "Personal Project", which is created and opened if the Space has none yet.
// With a template, the document starts with the template's title and content.
// Throws when it can't, so callers can show the error.
export function useNewDocument() {
  const navigate = useNavigate()
  const create = useCreateDocument()
  const targetFolder = useTargetFolder()
  return async (type: Document['doc_type'], folderId?: number, template?: DocumentTemplate) => {
    const target = await targetFolder(folderId)
    const doc = await create.mutateAsync({ folderId: target, ...(template ? { title: template.title, content: template.content } : { title: untitledTitle(type) }), doc_type: type })
    if (type === 'document') markUntouched(doc.id)
    // The id path opens at once; ItemRoute swaps in the hierarchical path once the Space tree has the new document.
    navigate(idPath({ type: 'document', id: doc.id }), { state: { focusTitle: true } })
  }
}
