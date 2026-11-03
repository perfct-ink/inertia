import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectStore {
  // The project the sidebar has open; null lists the whole Space. Every list
  // the API returns is narrowed to it (lib/api.ts sends X-Project-Id).
  activeProjectId: number | null
  setActive: (id: number | null) => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActive: (id) => set({ activeProjectId: id }),
    }),
    { name: 'inertia-project' }
  )
)
