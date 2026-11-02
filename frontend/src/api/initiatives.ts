import type { Initiative } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

// A new initiative can arrive with its dates, milestone and roadmap column set (templates do).
type NewInitiative = { title: string } & Partial<Pick<Initiative, 'description' | 'status' | 'milestone_id' | 'start_date' | 'target_date' | 'horizon'>>

export class InitiativeApi extends ApiResource<Initiative, NewInitiative> {
  constructor() {
    super('/api/v1/initiatives', 'initiative', 'initiatives')
  }
}

export const initiativeApi = new InitiativeApi()

export const useInitiatives = () => useResourceList(initiativeApi)
export const useCreateInitiative = () => useResourceCreate(initiativeApi, ['milestones'])
export const useUpdateInitiative = () => useResourceUpdate(initiativeApi, ['milestones'])
export const useDeleteInitiative = () => useResourceDelete(initiativeApi, ['epics'])
