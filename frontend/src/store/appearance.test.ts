import { useAppearanceStore } from './appearance'

beforeEach(() => useAppearanceStore.getState().reset())

test('starts on system with the teal accent, and remembers choices until reset', () => {
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'system', accent: 'teal' })
  useAppearanceStore.getState().setTheme('dark')
  useAppearanceStore.getState().setAccent('purple')
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'dark', accent: 'purple' })
  useAppearanceStore.getState().reset()
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'system', accent: 'teal' })
})
