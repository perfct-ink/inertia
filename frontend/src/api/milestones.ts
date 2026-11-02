import type { Milestone, PlanningStatus } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type MilestoneInput = { title: string; description: string | null; target_date: string | null; status: PlanningStatus }

export class MilestoneApi extends ApiResource<Milestone, Pick<MilestoneInput, 'title'> & Partial<MilestoneInput>, Partial<MilestoneInput>> {
  constructor() {
    super('/api/v1/milestones', 'milestone', 'milestones')
  }
}

export const milestoneApi = new MilestoneApi()

// Rollups change whenever tasks, epics or initiatives do, so always refetch on visit.
export const useMilestones = () => useResourceList(milestoneApi, { staleTime: 0 })
export const useCreateMilestone = () => useResourceCreate(milestoneApi)
export const useUpdateMilestone = () => useResourceUpdate(milestoneApi)
export const useDeleteMilestone = () => useResourceDelete(milestoneApi, ['epics', 'initiatives', 'tasks'])
