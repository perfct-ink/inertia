import { activeSprint, sprintBoardPath } from './sprint'
import type { Sprint } from '@/types'

const sprint = (id: number, status: Sprint['status']) => ({ id, status, title: `S${id}` }) as Sprint

test('activeSprint is the first active one, if any', () => {
  expect(activeSprint([sprint(1, 'planned'), sprint(2, 'active'), sprint(3, 'active')])?.id).toBe(2)
  expect(activeSprint([sprint(1, 'planned'), sprint(3, 'done')])).toBeUndefined()
})

test('a sprint board is the Workboard filtered to the sprint', () => {
  expect(sprintBoardPath(7)).toBe('/tasks?view=kanban&sprint_id=7')
})
