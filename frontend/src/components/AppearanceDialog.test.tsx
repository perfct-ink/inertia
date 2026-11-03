import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import AppearanceDialog from './AppearanceDialog'
import { useAppearanceStore } from '@/store/appearance'

beforeEach(() => useAppearanceStore.getState().reset())

test('choosing a mode and a colour theme updates the saved appearance, and reset undoes them', () => {
  render(<AppearanceDialog open onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'dark' } })
  fireEvent.click(screen.getByRole('radio', { name: 'Plum' }))
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'dark', colorTheme: 'purple' })
  expect(screen.getByRole('radio', { name: 'Plum' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: 'Inertia' })).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('radiogroup', { name: 'Colour theme' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'system', colorTheme: 'teal' })
})
