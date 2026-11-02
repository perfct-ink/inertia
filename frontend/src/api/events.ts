import api from '@/lib/api'
import type { WorkspaceEvent } from '@/types'
import { ApiResource, useApiMutation, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

export class EventApi extends ApiResource<WorkspaceEvent, { title: string; date: string; event_type: 'deadline' | 'milestone'; description?: string; start_time?: string; end_time?: string }> {
  constructor() {
    super('/api/v1/events', 'event', 'events')
  }

  addTask(eventId: number, taskId: number) {
    return api.post<WorkspaceEvent>(`${this.url(eventId)}/event_tasks`, { task_id: taskId }).then((r) => r.data)
  }

  removeTask(eventId: number, taskId: number) {
    return api.delete(`${this.url(eventId)}/event_tasks/${taskId}`)
  }
}

export const eventApi = new EventApi()

export const useEvents = () => useResourceList(eventApi)
export const useCreateEvent = () => useResourceCreate(eventApi)
export const useUpdateEvent = () => useResourceUpdate(eventApi)
export const useDeleteEvent = () => useResourceDelete(eventApi)
export const useAddTaskToEvent = () =>
  useApiMutation(({ eventId, taskId }: { eventId: number; taskId: number }) => eventApi.addTask(eventId, taskId), ['events'])
export const useRemoveTaskFromEvent = () =>
  useApiMutation(({ eventId, taskId }: { eventId: number; taskId: number }) => eventApi.removeTask(eventId, taskId), ['events'])
