import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import RoadmapTimeline, { EditableRoadmapTimeline } from './RoadmapTimeline'
import type { Epic, Initiative, Milestone } from '@/types'

const mockUpdateEpic = { mutate: jest.fn() }
const mockUpdateInitiative = { mutate: jest.fn() }
jest.mock('@/api/epics', () => ({ useUpdateEpic: () => mockUpdateEpic }))
jest.mock('@/api/initiatives', () => ({ useUpdateInitiative: () => mockUpdateInitiative }))

const milestones = [{ id: 1, title: 'Beta', target_date: '2026-12-01', health: 'on_track', percent: 40 }] as Milestone[]
const initiatives = [{
  id: 1, title: 'Growth', milestone_id: 1, start_date: '2026-10-01', target_date: '2026-11-30', tasks_count: 4, done_tasks_count: 1, health: 'on_track',
}] as Initiative[]
const epics = [
  { id: 7, title: 'Billing', initiative_id: 1, milestone_id: null, start_date: '2026-10-05', target_date: '2026-10-20', tasks_count: 2, done_tasks_count: 0 },
  { id: 8, title: 'Undated', initiative_id: null, milestone_id: null, start_date: null, target_date: null, tasks_count: 0, done_tasks_count: 0 },
] as Epic[]

const labels = () => screen.queryAllByRole('group').map((el) => el.getAttribute('aria-label')?.split(',')[0])

test('the public roadmap link is read-only', () => {
  const { container } = render(<RoadmapTimeline milestones={milestones} initiatives={initiatives} epics={epics} />)
  expect(labels()).toEqual([])
  expect(container.querySelectorAll('.timeline-bar--editable')).toHaveLength(0)
})

test('the signed-in roadmap saves an initiative or epic moved with the keys', () => {
  render(<EditableRoadmapTimeline milestones={milestones} initiatives={initiatives} epics={epics} />)
  // The undated epic has no bar.
  expect(labels()).toEqual(['Growth', 'Billing'])

  fireEvent.keyDown(screen.getByRole('group', { name: /^Growth,/ }), { key: 'ArrowRight' })
  fireEvent.keyDown(screen.getByRole('group', { name: /^Growth,/ }), { key: 'Enter' })
  expect(mockUpdateInitiative.mutate).toHaveBeenCalledWith({ id: 1, start_date: '2026-10-02', target_date: '2026-12-01' })

  fireEvent.keyDown(screen.getByRole('group', { name: /^Billing,/ }), { key: 'ArrowLeft', altKey: true })
  fireEvent.keyDown(screen.getByRole('group', { name: /^Billing,/ }), { key: 'Enter' })
  expect(mockUpdateEpic.mutate).toHaveBeenCalledWith({ id: 7, start_date: '2026-10-04', target_date: '2026-10-20' })
})
