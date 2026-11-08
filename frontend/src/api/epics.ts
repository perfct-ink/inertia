import type { Epic } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

// Making an epic (a feature) also makes its requirements document, in `folder_id` (its project), else the Personal Project.
export class EpicApi extends ApiResource<Epic, { title: string; folder_id?: number }> {
  constructor() {
    super('/api/v1/epics', 'epic', 'epics')
  }
}

export const epicApi = new EpicApi()

export const useEpics = () => useResourceList(epicApi)
// The requirements document is a new item in the folder tree, and deleting a feature removes it.
export const useCreateEpic = () => useResourceCreate(epicApi, ['milestones', 'workspace'])
export const useUpdateEpic = () => useResourceUpdate(epicApi, ['milestones'])
export const useDeleteEpic = () => useResourceDelete(epicApi, ['tasks', 'workspace'])
