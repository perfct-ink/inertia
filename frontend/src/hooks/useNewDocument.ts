import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/api/workspace'
import { useCreateDocument } from '@/api/documents'
import { useCreateFolder } from '@/api/folders'
import { untitledTitle } from '@/data/document'
import { projectsOf } from '@/data/folder'
import { idPath } from '@/data/path'
import { PERSONAL_PROJECT_NAME } from '@/data/project'
import { useSelectProject } from '@/hooks/useSelectProject'
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
  const { data: workspace } = useWorkspace()
  const create = useCreateDocument()
  const createFolder = useCreateFolder()
  const selectProject = useSelectProject()
  return async (type: Document['doc_type'], folderId?: number, template?: DocumentTemplate) => {
    let target = folderId
    if (!target) {
      if (!workspace) throw new Error('The space is still loading. Please try again.')
      const personal = projectsOf(workspace.folders ?? []).find((p) => p.name === PERSONAL_PROJECT_NAME)
        ?? await createFolder.mutateAsync({ name: PERSONAL_PROJECT_NAME, kind: 'project' })
      selectProject(personal.id)
      target = personal.id
    }
    const doc = await create.mutateAsync({ folderId: target, ...(template ? { title: template.title, content: template.content } : { title: untitledTitle(type) }), doc_type: type })
    if (type === 'document') markUntouched(doc.id)
    // The id path opens at once; ItemRoute swaps in the hierarchical path once the Space tree has the new document.
    navigate(idPath({ type: 'document', id: doc.id }), { state: { focusTitle: true } })
  }
}
