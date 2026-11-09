import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { CheckInStatus, Task, TaskCheckIn, TaskKind, TaskStatusChange } from '@/types'
import { ApiResource, useApiMutation, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

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
  ongoing?: boolean
  check_in_recurrence?: string
  kind?: TaskKind
  assignee_ids?: number[]
  watcher_ids?: number[]
}

// The answer to a check-in request: a status, and a note if the owner has one.
export interface NewTaskCheckIn {
  status: CheckInStatus
  note?: string
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

  // An ongoing task's check-ins, oldest first.
  checkIns(id: number) {
    return api.get<TaskCheckIn[]>(`${this.path}/${id}/check_ins`).then((r) => r.data)
  }

  // Answers a check-in request; the schedule counts again from now.
  addCheckIn(id: number, checkIn: NewTaskCheckIn) {
    return api.post<TaskCheckIn>(`${this.path}/${id}/check_ins`, { check_in: checkIn }).then((r) => r.data)
  }
}

export const taskApi = new TaskApi()

export const useTasks = (filters: TaskFilters = {}) => useResourceList(taskApi, { params: filters })
export const useCreateTask = () => useResourceCreate(taskApi)
export const useUpdateTask = () => useResourceUpdate(taskApi)
// The server drops a deleted task's Gantt links with it.
export const useDeleteTask = () => useResourceDelete(taskApi, ['task_dependencies'])

export const useTaskStatusChanges = (taskId: number, enabled: boolean) =>
  useQuery({ queryKey: ['task_status_changes', taskId], queryFn: () => taskApi.statusChanges(taskId), enabled })

export const useTaskCheckIns = (taskId: number, enabled: boolean) =>
  useQuery({ queryKey: ['task_check_ins', taskId], queryFn: () => taskApi.checkIns(taskId), enabled })

// The task list changes too: the new check-in ends "Check-in overdue" and sets the status shown on the task.
export const useAddTaskCheckIn = (taskId: number) =>
  useApiMutation((checkIn: NewTaskCheckIn) => taskApi.addCheckIn(taskId, checkIn), [['task_check_ins', taskId], 'tasks'])
