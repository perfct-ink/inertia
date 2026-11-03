import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COLOR_THEMES, DEFAULT_APPEARANCE, type Appearance, type ColorThemeId, type ThemeChoice } from '@/data/appearance'

// The person's appearance choice on this device (it is not sent to the server).
interface AppearanceStore extends Appearance {
  setTheme: (theme: ThemeChoice) => void
  setColorTheme: (colorTheme: ColorThemeId) => void
  reset: () => void
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme }),
      reset: () => set(DEFAULT_APPEARANCE),
    }),
    {
      name: 'inertia-appearance',
      version: 1,
      // Version 0 saved an accent preset; its id is now the colour theme's.
      migrate: (saved, version) => {
        const state = (saved ?? {}) as Partial<Appearance> & { accent?: string }
        if (version < 1) {
          const colorTheme = COLOR_THEMES.find((t) => t.id === state.accent)?.id ?? DEFAULT_APPEARANCE.colorTheme
          return { theme: state.theme ?? DEFAULT_APPEARANCE.theme, colorTheme }
        }
        return state
      },
    }
  )
)
