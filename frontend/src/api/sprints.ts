import type { Sprint, PlanningStatus } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type SprintInput = {
  title: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: PlanningStatus
  owner_id: number | null
}

export class SprintApi extends ApiResource<Sprint, Pick<SprintInput, 'title'> & Partial<SprintInput>, Partial<SprintInput>> {
  constructor() {
    super('/api/v1/sprints', 'sprint', 'sprints')
  }
}

export const sprintApi = new SprintApi()

// tasks_count/done_tasks_count change whenever a task does, so always
// refetch on visit — same reasoning as useMilestones.
export const useSprints = () => useResourceList(sprintApi, { staleTime: 0 })
export const useCreateSprint = () => useResourceCreate(sprintApi)
export const useUpdateSprint = () => useResourceUpdate(sprintApi)
export const useDeleteSprint = () => useResourceDelete(sprintApi, ['tasks'])
