import type { Objective, PlanningStatus } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type ObjectiveInput = {
  title: string
  description: string | null
  status: PlanningStatus
  start_date: string | null
  target_date: string | null
}

export class ObjectiveApi extends ApiResource<Objective, Pick<ObjectiveInput, 'title'> & Partial<ObjectiveInput>, Partial<ObjectiveInput>> {
  constructor() {
    super('/api/v1/objectives', 'objective', 'objectives')
  }
}

export const objectiveApi = new ObjectiveApi()

// Linked key results move with task progress, so always refetch on visit.
export const useObjectives = () => useResourceList(objectiveApi, { staleTime: 0 })
export const useCreateObjective = () => useResourceCreate(objectiveApi)
export const useUpdateObjective = () => useResourceUpdate(objectiveApi)
export const useDeleteObjective = () => useResourceDelete(objectiveApi)
