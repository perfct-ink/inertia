import { useNavigate } from 'react-router-dom'
import { useCreateEpic } from '@/api/epics'
import { useTargetFolder } from '@/hooks/useTargetFolder'

// Makes a feature (an epic with its requirements document, made by the server
// from the requirements template) in a folder, and opens the document. With no
// folder it goes in the Personal Project, like a new document. Throws when it
// can't, so callers can show the error.
export function useNewFeature() {
  const navigate = useNavigate()
  const create = useCreateEpic()
  const targetFolder = useTargetFolder()
  return async (title: string, folderId?: number) => {
    const epic = await create.mutateAsync({ title, folder_id: await targetFolder(folderId) })
    if (epic.document_id) navigate(`/documents/${epic.document_id}`)
    return epic
  }
}
