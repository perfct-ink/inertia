import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ALL_PROJECT_FEATURES } from '@/data/projectFeature'
import type { Folder } from '@/types'
import ProjectFeaturesDialog from './ProjectFeaturesDialog'

const mockMutate = jest.fn()
jest.mock('@/api/folders', () => ({
  useUpdateFolder: () => ({ mutate: mockMutate, isPending: false }),
}))

const project = (features?: string[] | null) => ({ id: 7, name: 'Messages', kind: 'project', features } as Folder)

beforeEach(() => mockMutate.mockReset())

test('a project that never chose has every page checked, grouped as in the sidebar', () => {
  render(<ProjectFeaturesDialog project={project()} onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Features for Messages' })).toBeInTheDocument()
  const boxes = screen.getAllByRole('checkbox')
  expect(boxes).toHaveLength(ALL_PROJECT_FEATURES.length)
  expect(boxes.every((box) => (box as HTMLInputElement).checked)).toBe(true)
  expect(within(screen.getByRole('group', { name: 'Planning' })).getByRole('checkbox', { name: 'Sprints' })).toBeChecked()
})

test('a project with a list has only those pages checked', () => {
  render(<ProjectFeaturesDialog project={project(['tasks', 'okrs'])} onClose={jest.fn()} />)
  expect(screen.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked).map((box) => box.parentElement?.textContent)).toEqual(['Tasks', 'OKRs'])
})

test('turning pages on and off saves the whole list in sidebar order and closes', () => {
  const onClose = jest.fn()
  mockMutate.mockImplementation((_data, options) => options.onSuccess())
  render(<ProjectFeaturesDialog project={project(['tasks', 'okrs'])} onClose={onClose} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprints' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tasks' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockMutate).toHaveBeenCalledWith({ id: 7, features: ['sprints', 'okrs'] }, expect.anything())
  expect(onClose).toHaveBeenCalled()
})

test('a failed save stays open and shows the error', () => {
  const onClose = jest.fn()
  mockMutate.mockImplementation((_data, options) => options.onError(new Error('nope')))
  render(<ProjectFeaturesDialog project={project()} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save')
  expect(onClose).not.toHaveBeenCalled()
})

test('cancel closes without saving, and nothing shows with no project', () => {
  const onClose = jest.fn()
  const { rerender } = render(<ProjectFeaturesDialog project={project()} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(mockMutate).not.toHaveBeenCalled()

  rerender(<ProjectFeaturesDialog project={null} onClose={onClose} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
