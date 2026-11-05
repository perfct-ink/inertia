import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { TaskTimer } from './TaskTimer'
import type { Task } from '@/types'

const mockStart = { mutate: jest.fn(), isPending: false }
const mockStop = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/timeEntries', () => ({
  useStartTimer: () => mockStart,
  useStopTimer: () => mockStop,
}))

const task = (extra: Partial<Task>) => ({ id: 7, title: 'Ship', ...extra }) as Task

test('a stopped task shows its logged time and starts a timer', () => {
  render(<TaskTimer task={task({ logged_minutes: 135 })} />)
  expect(screen.getByText('2h 15m')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Start timer on Ship' }))
  expect(mockStart.mutate).toHaveBeenCalledWith(7)
})

test('a task with nothing logged says so', () => {
  render(<TaskTimer task={task({})} />)
  expect(screen.getByText('No time logged')).toBeInTheDocument()
})

test('a running timer shows the clock and stops by entry id', () => {
  render(<TaskTimer task={task({ timer_entry_id: 3, timer_started_at: new Date().toISOString() })} />)
  expect(screen.getByText(/^0:00:0\d/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Stop timer on Ship' }))
  expect(mockStop.mutate).toHaveBeenCalledWith(3)
})
