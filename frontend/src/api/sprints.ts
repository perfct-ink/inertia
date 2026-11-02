import type { Sprint, PlanningStatus } from '@/types'
import api from '@/lib/api'
import { ApiResource, useApiMutation, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

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

  // Starts a planned sprint (a missing start date becomes today).
  start(id: number) {
    return api.post<Sprint>(`${this.url(id)}/start`).then((r) => r.data)
  }

  // Closes an active sprint; unfinished tasks move to `carryToSprintId` or lose their sprint.
  close(id: number, carryToSprintId: number | null) {
    return api.post<{ sprint: Sprint; completed: number; carried_over: number }>(`${this.url(id)}/close`, { carry_to_sprint_id: carryToSprintId }).then((r) => r.data)
  }
}

export const sprintApi = new SprintApi()

// tasks_count/done_tasks_count change whenever a task does, so always
// refetch on visit — same reasoning as useMilestones.
export const useSprints = () => useResourceList(sprintApi, { staleTime: 0 })
export const useCreateSprint = () => useResourceCreate(sprintApi)
export const useUpdateSprint = () => useResourceUpdate(sprintApi)
export const useDeleteSprint = () => useResourceDelete(sprintApi, ['tasks'])

export const useStartSprint = () => useApiMutation((id: number) => sprintApi.start(id), ['sprints'])
export const useCloseSprint = () =>
  useApiMutation(({ id, carryToSprintId }: { id: number; carryToSprintId: number | null }) => sprintApi.close(id, carryToSprintId), ['sprints', 'tasks'])
