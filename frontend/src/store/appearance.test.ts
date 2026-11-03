import { useAppearanceStore } from './appearance'

beforeEach(() => useAppearanceStore.getState().reset())

test('starts on system with the Inertia theme, and remembers choices until reset', () => {
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'system', colorTheme: 'teal' })
  useAppearanceStore.getState().setTheme('dark')
  useAppearanceStore.getState().setColorTheme('purple')
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'dark', colorTheme: 'purple' })
  useAppearanceStore.getState().reset()
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'system', colorTheme: 'teal' })
})

test('a saved accent from before colour themes becomes the matching theme', async () => {
  const migrate = useAppearanceStore.persist.getOptions().migrate!
  expect(await migrate({ theme: 'dark', accent: 'orange' }, 0)).toEqual({ theme: 'dark', colorTheme: 'orange' })
  expect(await migrate({ theme: 'light', accent: 'unknown' }, 0)).toEqual({ theme: 'light', colorTheme: 'teal' })
})
