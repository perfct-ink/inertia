import type { TaskDependency } from '@/types'
import { drivingPath, linkSides, planReschedule } from './dependency'

const dep = (predecessor_id: number, successor_id: number, kind: TaskDependency['kind'] = 'finish_to_start') =>
  ({ id: predecessor_id * 100 + successor_id, predecessor_id, successor_id, kind, created_at: '' })

test('link sides follow the kind name', () => {
  expect(linkSides('finish_to_start')).toEqual({ from: 'end', to: 'start' })
  expect(linkSides('start_to_finish')).toEqual({ from: 'start', to: 'end' })
})

test('the driving path walks back from the last finish through the latest predecessor', () => {
  const tasks = [
    { id: 1, start_date: '2026-11-01', due_date: '2026-11-05' },
    { id: 2, start_date: '2026-11-01', due_date: '2026-11-10' },
    { id: 3, start_date: '2026-11-11', due_date: '2026-11-20' },
    { id: 4, start_date: null, due_date: null },
  ]
  expect([...drivingPath(tasks, [dep(1, 3), dep(2, 3), dep(4, 3)])].sort()).toEqual([2, 3])
})

test('no links, or a last task with no predecessors, is no path', () => {
  const tasks = [{ id: 1, due_date: '2026-11-05' }, { id: 2, due_date: '2026-11-10' }]
  expect(drivingPath(tasks, []).size).toBe(0)
  expect(drivingPath(tasks, [dep(2, 1)]).size).toBe(0)
})

describe('planReschedule', () => {
  const t = (id: number, start_date: string, due_date: string) => ({ id, title: `T${id}`, start_date, due_date })
  // 1 -> 2 -> 3, each finish-to-start, laid end to end.
  const tasks = [t(1, '2026-01-01', '2026-01-05'), t(2, '2026-01-05', '2026-01-08'), t(3, '2026-01-08', '2026-01-10')]
  const chain = [dep(1, 2), dep(2, 3)]

  test('none moves only the task', () => {
    expect(planReschedule(tasks, chain, 1, '2026-01-10', '2026-01-15', 'none'))
      .toEqual({ updates: [{ id: 1, start_date: '2026-01-10', due_date: '2026-01-15' }] })
  })

  test('strict refuses a move that breaks a link, in either direction', () => {
    expect(planReschedule(tasks, chain, 1, '2026-01-02', '2026-01-06', 'strict')).toHaveProperty('error')
    expect(planReschedule(tasks, chain, 2, '2026-01-03', '2026-01-06', 'strict')).toHaveProperty('error')
    expect(planReschedule(tasks, chain, 1, '2025-12-30', '2026-01-04', 'strict')).toHaveProperty('updates')
  })

  test('flexible pushes dependants later by the shortfall, keeping their length', () => {
    const plan = planReschedule(tasks, chain, 1, '2026-01-03', '2026-01-07', 'flexible')
    expect(plan).toEqual({
      updates: [
        { id: 1, start_date: '2026-01-03', due_date: '2026-01-07' },
        { id: 2, start_date: '2026-01-07', due_date: '2026-01-10' },
        { id: 3, start_date: '2026-01-10', due_date: '2026-01-12' },
      ],
    })
  })

  test('flexible leaves dependants that still fit alone', () => {
    const gap = [t(1, '2026-01-01', '2026-01-05'), t(2, '2026-01-07', '2026-01-09')]
    expect(planReschedule(gap, [dep(1, 2)], 1, '2026-01-02', '2026-01-06', 'flexible'))
      .toEqual({ updates: [{ id: 1, start_date: '2026-01-02', due_date: '2026-01-06' }] })
  })

  test('flexible pulls dependants that were on their link earlier with the task', () => {
    expect(planReschedule(tasks, chain, 1, '2025-12-28', '2026-01-02', 'flexible')).toEqual({
      updates: [
        { id: 1, start_date: '2025-12-28', due_date: '2026-01-02' },
        { id: 2, start_date: '2026-01-02', due_date: '2026-01-05' },
        { id: 3, start_date: '2026-01-05', due_date: '2026-01-07' },
      ],
    })
  })

  test('flexible leaves a deliberate gap alone when the task moves earlier', () => {
    const gap = [t(1, '2026-01-01', '2026-01-05'), t(2, '2026-01-07', '2026-01-09')]
    expect(planReschedule(gap, [dep(1, 2)], 1, '2025-12-28', '2026-01-02', 'flexible'))
      .toEqual({ updates: [{ id: 1, start_date: '2025-12-28', due_date: '2026-01-02' }] })
  })

  test('flexible only pulls on the side the link uses', () => {
    expect(planReschedule(tasks, chain, 1, '2025-12-28', '2026-01-05', 'flexible'))
      .toEqual({ updates: [{ id: 1, start_date: '2025-12-28', due_date: '2026-01-05' }] })
  })

  test('a pulled dependant stops where its other links allow', () => {
    // 3 sits on the finish of 1 and has a day to spare after the finish of 2.
    const two = [t(1, '2026-01-01', '2026-01-05'), t(2, '2026-01-01', '2026-01-04'), t(3, '2026-01-05', '2026-01-08')]
    expect(planReschedule(two, [dep(1, 3), dep(2, 3)], 1, '2025-12-28', '2026-01-02', 'flexible')).toEqual({
      updates: [
        { id: 1, start_date: '2025-12-28', due_date: '2026-01-02' },
        { id: 3, start_date: '2026-01-04', due_date: '2026-01-07' },
      ],
    })
  })

  test('start-to-start compares starts', () => {
    const plan = planReschedule([t(1, '2026-01-01', '2026-01-05'), t(2, '2026-01-01', '2026-01-03')], [dep(1, 2, 'start_to_start')], 1, '2026-01-04', '2026-01-08', 'flexible')
    expect(plan).toEqual({
      updates: [
        { id: 1, start_date: '2026-01-04', due_date: '2026-01-08' },
        { id: 2, start_date: '2026-01-04', due_date: '2026-01-06' },
      ],
    })
  })

  test('start-to-start dependants follow a start moved earlier', () => {
    const plan = planReschedule([t(1, '2026-01-01', '2026-01-05'), t(2, '2026-01-01', '2026-01-03')], [dep(1, 2, 'start_to_start')], 1, '2025-12-29', '2026-01-02', 'flexible')
    expect(plan).toEqual({
      updates: [
        { id: 1, start_date: '2025-12-29', due_date: '2026-01-02' },
        { id: 2, start_date: '2025-12-29', due_date: '2025-12-31' },
      ],
    })
  })
})
