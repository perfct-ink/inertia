import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActivityButton } from './ActivityButton'

jest.mock('@/api/activities', () => ({
  useActivities: () => ({ data: [], isLoading: false, isError: false }),
}))

// The modal prints its title as the heading and again as a hidden description, so match all of them.
const dialogTitles = () => screen.queryAllByText('Activity: Launch')

test('opens the activity of its item and keeps the click from reaching the card around it', () => {
  const cardClick = jest.fn()
  render(
    <div onClick={cardClick}>
      <ActivityButton subjectType="Epic" subjectId={7} title="Launch" />
    </div>
  )
  expect(dialogTitles()).toHaveLength(0)

  fireEvent.click(screen.getByRole('button', { name: 'Activity of Launch' }))

  expect(dialogTitles().length).toBeGreaterThan(0)
  expect(cardClick).not.toHaveBeenCalled()
})

test('clicks inside the dialog do not reach the card either, and Close hides it', () => {
  const cardClick = jest.fn()
  render(
    <div onClick={cardClick}>
      <ActivityButton subjectType="Epic" subjectId={7} title="Launch" />
    </div>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Activity of Launch' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))

  expect(cardClick).not.toHaveBeenCalled()
  expect(dialogTitles()).toHaveLength(0)
})
