import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceStore {
  // null = the user's personal workspace (the server default).
  activeWorkspaceId: number | null
  setActive: (id: number | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActive: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: 'inertia-workspace' }
  )
)
