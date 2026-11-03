import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWorkspaceStore } from './workspaces'
import { useProjectStore } from './projects'

// A different account must never inherit the previous one's Space or project.
function forgetPlace() {
  useWorkspaceStore.getState().setActive(null)
  useProjectStore.getState().setActive(null)
}

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
      setAuth: (token, user) => {
        forgetPlace()
        set({ token, user })
      },
      logout: () => {
        forgetPlace()
        set({ token: null, user: null })
      },
    }),
    { name: 'inertia-auth' }
  )
)
