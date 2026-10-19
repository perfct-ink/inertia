import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import AppearanceDialog from './AppearanceDialog'
import { useAppearanceStore } from '@/store/appearance'

beforeEach(() => useAppearanceStore.getState().reset())

test('choosing a theme and an accent updates the saved appearance, and reset undoes them', () => {
  render(<AppearanceDialog open onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } })
  fireEvent.click(screen.getByRole('radio', { name: 'Purple' }))
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'dark', accent: 'purple' })
  expect(screen.getByRole('radio', { name: 'Purple' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'false')

  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(useAppearanceStore.getState()).toMatchObject({ theme: 'system', accent: 'teal' })
})
