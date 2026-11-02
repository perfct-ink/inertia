import type { Initiative } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

export class InitiativeApi extends ApiResource<Initiative, { title: string }> {
  constructor() {
    super('/api/v1/initiatives', 'initiative', 'initiatives')
  }
}

export const initiativeApi = new InitiativeApi()

export const useInitiatives = () => useResourceList(initiativeApi)
export const useCreateInitiative = () => useResourceCreate(initiativeApi, ['milestones'])
export const useUpdateInitiative = () => useResourceUpdate(initiativeApi, ['milestones'])
export const useDeleteInitiative = () => useResourceDelete(initiativeApi, ['epics'])
