import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AppNotification } from '@/types'
import { ApiResource, useApiMutation } from './base'

export interface Inbox { unread_count: number; notifications: AppNotification[] }

// The signed-in person's notifications. The list comes back as an Inbox
// (unread count plus the rows), and marking one read is a bare PATCH.
export class NotificationApi extends ApiResource<AppNotification, never, Record<string, never>> {
  constructor() {
    super('/api/v1/notifications', null, 'notifications')
  }

  // Failures stay quiet: the inbox is polled in the background.
  inbox() {
    return api.get<Inbox>(this.path, { silent: true }).then((r) => r.data)
  }

  markRead(id: number) {
    return api.patch<AppNotification>(this.url(id)).then((r) => r.data)
  }

  markAllRead() {
    return api.post(`${this.path}/read_all`)
  }
}

export const notificationApi = new NotificationApi()

// Polled once a minute so the unread badge stays current without push.
export function useNotifications() {
  return useQuery<Inbox>({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.inbox(),
    refetchInterval: 60_000,
  })
}

export const useMarkNotificationRead = () => useApiMutation((id: number) => notificationApi.markRead(id), ['notifications'])
export const useMarkAllNotificationsRead = () => useApiMutation<void, unknown>(() => notificationApi.markAllRead(), ['notifications'])
