import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { TaskDetail } from './TaskDetail'
import type { Task } from '@/types'

const mockUpdate = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/tasks', () => ({ useUpdateTask: () => mockUpdate }))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [{ id: 3, title: 'Launch' }] }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [{ id: 5, title: 'Sprint 1' }] }) }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [{ id: 9, title: 'Beta' }, { id: 10, title: 'GA' }] }) }))

const task = { id: 1, title: 'Ship', description: null, status: 'todo', start_date: null, due_date: '2026-10-20', epic_id: 3, sprint_id: null, milestone_id: 9 } as unknown as Task

afterEach(() => jest.clearAllMocks())

test('changing the milestone and a date sends only those fields', () => {
  const onClose = jest.fn()
  mockUpdate.mutate.mockImplementation((_data, { onSuccess }) => onSuccess())
  render(<TaskDetail task={task} onClose={onClose} />)
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Milestone'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, milestone_id: 10, due_date: null }, expect.anything())
  expect(onClose).toHaveBeenCalled()
})

test('a blank title blocks saving and shows why', () => {
  render(<TaskDetail task={task} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: ' ' } })
  expect(screen.getByRole('alert')).toHaveTextContent('A task needs a title.')
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
})

test('a failed save shows an error and keeps the dialog open', () => {
  const onClose = jest.fn()
  mockUpdate.mutate.mockImplementation((_data, { onError }) => onError(new Error('x')))
  render(<TaskDetail task={task} onClose={onClose} />)
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Ship it' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save')
  expect(onClose).not.toHaveBeenCalled()
})
