import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWorkspaceStore } from './workspaces'

interface User {
  id: number
  name: string
  email: string
}

interface AuthStore {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      // A different account must never inherit the previous one's workspace.
      setAuth: (token, user) => {
        useWorkspaceStore.getState().setActive(null)
        set({ token, user })
      },
      logout: () => {
        useWorkspaceStore.getState().setActive(null)
        set({ token: null, user: null })
      },
    }),
    { name: 'inertia-auth' }
  )
)
