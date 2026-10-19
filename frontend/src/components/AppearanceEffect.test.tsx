import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import AppearanceEffect from './AppearanceEffect'
import { useAppearanceStore } from '@/store/appearance'

beforeEach(() => {
  useAppearanceStore.getState().reset()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('style')
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() })) as unknown as typeof window.matchMedia
})

test('system leaves data-theme unset and applies no accent override', () => {
  render(<AppearanceEffect />)
  expect(document.documentElement).not.toHaveAttribute('data-theme')
  expect(document.documentElement.style.getPropertyValue('--v-accent')).toBe('')
})

test('dark sets data-theme and a chosen accent sets the tokens, which reset removes', () => {
  useAppearanceStore.setState({ theme: 'dark', accent: 'blue' })
  const { rerender } = render(<AppearanceEffect />)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(document.documentElement.style.getPropertyValue('--v-accent')).toBe('hsl(217deg 72% 42%)')

  useAppearanceStore.getState().reset()
  rerender(<AppearanceEffect />)
  expect(document.documentElement).not.toHaveAttribute('data-theme')
  expect(document.documentElement.style.getPropertyValue('--v-accent')).toBe('')
})
