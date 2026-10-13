import { create } from 'zustand'

export interface Notification {
  id: number
  message: string
}

interface NotificationStore {
  notifications: Notification[]
  notify: (message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],
  notify: (message) => set((state) => (
    // Collapse repeats so a burst of identical failures shows one notice.
    state.notifications.some((n) => n.message === message)
      ? state
      : { notifications: [...state.notifications, { id: nextId++, message }] }
  )),
  dismiss: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}))
