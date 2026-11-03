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

test('system leaves data-theme unset and applies no accent override or sidebar tint', () => {
  render(<AppearanceEffect />)
  expect(document.documentElement).not.toHaveAttribute('data-theme')
  expect(document.documentElement).not.toHaveAttribute('data-sidebar')
  expect(document.documentElement.style.getPropertyValue('--v-accent')).toBe('')
})

test('dark sets data-theme and a colour theme sets its tokens and tints the sidebar, which reset removes', () => {
  useAppearanceStore.setState({ theme: 'dark', colorTheme: 'purple' })
  const { rerender } = render(<AppearanceEffect />)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(document.documentElement.style.getPropertyValue('--v-accent')).toBe('hsl(262deg 72% 42%)')
  expect(document.documentElement).toHaveAttribute('data-sidebar', 'tinted')
  expect(document.documentElement.style.getPropertyValue('--sidebar-background')).toBe('hsl(285deg 35% 18%)')

  useAppearanceStore.getState().reset()
  rerender(<AppearanceEffect />)
  expect(document.documentElement).not.toHaveAttribute('data-theme')
  expect(document.documentElement.style.getPropertyValue('--v-accent')).toBe('')
  expect(document.documentElement).not.toHaveAttribute('data-sidebar')
  expect(document.documentElement.style.getPropertyValue('--sidebar-background')).toBe('')
})
