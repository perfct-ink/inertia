import type { SavedProjectType } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList } from './base'

// The project types a Space saved from its own projects. The built-in types are
// in data/projectType.ts. Failed calls show an error notice through the shared
// api client.

// Saves a project (a folder with kind: project) as a type: its documents,
// Collections and tasks become the template.
export interface SaveProjectTypeInput {
  name: string
  from_folder_id: number
  description?: string
  icon?: string
}

export class ProjectTypeApi extends ApiResource<SavedProjectType, SaveProjectTypeInput, never> {
  constructor() {
    super('/api/v1/project_types', 'project_type', 'project_types')
  }
}

export const projectTypeApi = new ProjectTypeApi()

export const useProjectTypes = () => useResourceList(projectTypeApi)
export const useSaveProjectType = () => useResourceCreate(projectTypeApi)
// Deleting returns the projects started from it to blank, so the tree is refetched.
export const useDeleteProjectType = () => useResourceDelete(projectTypeApi, ['workspace'])
