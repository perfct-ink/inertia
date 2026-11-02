import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_APPEARANCE, type AccentId, type Appearance, type ThemeChoice } from '@/data/appearance'

// The person's appearance choice on this device (it is not sent to the server).
interface AppearanceStore extends Appearance {
  setTheme: (theme: ThemeChoice) => void
  setAccent: (accent: AccentId) => void
  reset: () => void
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      reset: () => set(DEFAULT_APPEARANCE),
    }),
    { name: 'inertia-appearance' }
  )
)
