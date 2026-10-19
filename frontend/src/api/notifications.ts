import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AppNotification } from '@/types'

export interface Inbox { unread_count: number; notifications: AppNotification[] }

// The signed-in person's inbox. Polled once a minute so the unread badge stays
// current without push; failures stay quiet because it runs in the background.
export function useNotifications() {
  return useQuery<Inbox>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/v1/notifications', { silent: true }).then((r) => r.data),
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/notifications/${id}`).then((r) => r.data as AppNotification),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/v1/notifications/read_all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
