import type { Epic } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

export class EpicApi extends ApiResource<Epic, { title: string }> {
  constructor() {
    super('/api/v1/epics', 'epic', 'epics')
  }
}

export const epicApi = new EpicApi()

export const useEpics = () => useResourceList(epicApi)
export const useCreateEpic = () => useResourceCreate(epicApi, ['milestones'])
export const useUpdateEpic = () => useResourceUpdate(epicApi, ['milestones'])
export const useDeleteEpic = () => useResourceDelete(epicApi, ['tasks'])
