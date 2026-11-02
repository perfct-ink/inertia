import type { DependencyKind, TaskDependency } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList } from './base'

export class TaskDependencyApi extends ApiResource<TaskDependency, { predecessor_id: number; successor_id: number; kind: DependencyKind }> {
  constructor() {
    super('/api/v1/task_dependencies', 'task_dependency', 'task_dependencies')
  }
}

export const taskDependencyApi = new TaskDependencyApi()

export const useTaskDependencies = () => useResourceList(taskDependencyApi)
export const useCreateTaskDependency = () => useResourceCreate(taskDependencyApi)
export const useDeleteTaskDependency = () => useResourceDelete(taskDependencyApi)
