import { carryTargets, closeSummary } from './sprint'
import type { Sprint } from '@/types'

const sprint = (id: number, status: Sprint['status']) => ({ id, status, title: `S${id}` }) as Sprint

test('carry targets are the other sprints that are not done', () => {
  const sprints = [sprint(1, 'active'), sprint(2, 'planned'), sprint(3, 'done'), sprint(4, 'active')]
  expect(carryTargets(sprints, { id: 1 }).map((s) => s.id)).toEqual([2, 4])
})

test('closeSummary reads naturally for one and many', () => {
  expect(closeSummary(1, 0)).toBe('1 task done, 0 moved on')
  expect(closeSummary(3, 2)).toBe('3 tasks done, 2 moved on')
})
