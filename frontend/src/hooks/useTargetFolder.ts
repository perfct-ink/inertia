import { useWorkspace } from '@/api/workspace'
import { useCreateFolder } from '@/api/folders'
import { projectsOf } from '@/data/folder'
import { PERSONAL_PROJECT_NAME } from '@/data/project'
import { useSelectProject } from '@/hooks/useSelectProject'

// Where something new is filed: the folder given, else the "Personal Project",
// which is created and opened if the Space has none yet. Throws when it can't,
// so callers can show the error.
export function useTargetFolder() {
  const { data: workspace } = useWorkspace()
  const createFolder = useCreateFolder()
  const selectProject = useSelectProject()
  return async (folderId?: number): Promise<number> => {
    if (folderId) return folderId
    if (!workspace) throw new Error('The space is still loading. Please try again.')
    const personal = projectsOf(workspace.folders ?? []).find((p) => p.name === PERSONAL_PROJECT_NAME)
      ?? await createFolder.mutateAsync({ name: PERSONAL_PROJECT_NAME, kind: 'project' })
    selectProject(personal.id)
    return personal.id
  }
}
