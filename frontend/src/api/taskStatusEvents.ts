import type { TaskStatusEvent } from '@/types'
import { ApiResource, useResourceList } from './base'

// Every status change of the Space's tasks (of the open project's, when one is
// open), oldest first, which the agile reports are worked out from
// (data/report.ts). One task's own history, with who made each change, is
// `TaskApi.statusChanges`.
export class TaskStatusEventApi extends ApiResource<TaskStatusEvent, never, never> {
  constructor() {
    super('/api/v1/task_status_changes', 'task_status_change', 'task_status_events')
  }
}

export const taskStatusEventApi = new TaskStatusEventApi()

// The history grows whenever a task changes status, so it is fetched on every visit.
export const useTaskStatusEvents = () => useResourceList(taskStatusEventApi, { staleTime: 0 })
