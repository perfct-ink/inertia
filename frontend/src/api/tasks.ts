import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Task, TaskKind, TaskStatusChange } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

export interface TaskFilters {
  q?: string
  status?: string
  folder_id?: number
  document_id?: number
  epic_id?: number
  sprint_id?: number
  kind?: TaskKind
  assignee_id?: number
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
  priority?: Task['priority']
  estimate_hours?: number
  story_points?: number
  recurrence?: string
  kind?: TaskKind
  assignee_ids?: number[]
  watcher_ids?: number[]
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

  // Every status a task has been in, oldest first, with who changed it.
  statusChanges(id: number) {
    return api.get<TaskStatusChange[]>(`${this.path}/${id}/status_changes`).then((r) => r.data)
  }
}

export const taskApi = new TaskApi()

// `enabled` and `refetchInterval` are for lists left on screen, such as the one
// embedded in a document (see useResourceList).
export const useTasks = (filters: TaskFilters = {}, options: { enabled?: boolean; refetchInterval?: number } = {}) =>
  useResourceList(taskApi, { params: filters, ...options })
export const useCreateTask = () => useResourceCreate(taskApi)
export const useUpdateTask = () => useResourceUpdate(taskApi)
// The server drops a deleted task's Gantt links with it.
export const useDeleteTask = () => useResourceDelete(taskApi, ['task_dependencies'])

export const useTaskStatusChanges = (taskId: number, enabled: boolean) =>
  useQuery({ queryKey: ['task_status_changes', taskId], queryFn: () => taskApi.statusChanges(taskId), enabled })
