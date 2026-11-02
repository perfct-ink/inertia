import api from '@/lib/api'
import type { Task } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

export interface TaskFilters {
  q?: string
  status?: string
  folder_id?: number
  document_id?: number
  epic_id?: number
  sprint_id?: number
}

export interface NewTask {
  title: string
  status?: Task['status']
  startDate?: string
  dueDate?: string
  documentId?: number
  folder_id?: number
  epicId?: number
  sprintId?: number
  milestoneId?: number
  parentId?: number
}

export class TaskApi extends ApiResource<Task, NewTask> {
  constructor() {
    super('/api/v1/tasks', 'task', 'tasks')
  }

  // The form uses camelCase; a task made from a document is created under it.
  create({ documentId, startDate, dueDate, epicId, sprintId, milestoneId, parentId, ...rest }: NewTask) {
    const url = documentId ? `/api/v1/documents/${documentId}/tasks` : this.path
    const task = { ...rest, start_date: startDate, due_date: dueDate, epic_id: epicId, sprint_id: sprintId, milestone_id: milestoneId, parent_id: parentId }
    return api.post<Task>(url, this.body(task)).then((r) => r.data)
  }
}

export const taskApi = new TaskApi()

export const useTasks = (filters: TaskFilters = {}) => useResourceList(taskApi, { params: filters })
export const useCreateTask = () => useResourceCreate(taskApi)
export const useUpdateTask = () => useResourceUpdate(taskApi)
// The server drops a deleted task's Gantt links with it.
export const useDeleteTask = () => useResourceDelete(taskApi, ['task_dependencies'])
