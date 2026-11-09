import type { Folder, Task, TaskDependency, TaskLink } from '@/types'
import { DEPENDENCY_KINDS, NO_PROJECT, drivingPath, externalEnd, kindFromSides, linkCandidates, linkSides, planReschedule, splitDependencies } from './dependency'

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

test('kindFromSides is the reverse of linkSides for all four kinds', () => {
  for (const kind of DEPENDENCY_KINDS) {
    const { from, to } = linkSides(kind)
    expect(kindFromSides(from, to)).toBe(kind)
  }
  expect(kindFromSides('end', 'start')).toBe('finish_to_start')
})

describe('links to other projects', () => {
  const folder = (id: number, name: string, kind: Folder['kind'], children: Folder[] = []) =>
    ({ id, name, kind, children, documents: [], parent_id: null }) as unknown as Folder
  const folders = [folder(1, 'Messages', 'project', [folder(2, 'Design', 'folder')]), folder(3, 'Billing', 'project')]
  const link = (id: number, due_date: string | null, folder_id: number | null, start_date: string | null = null) =>
    ({ id, title: `T${id}`, status: 'todo', start_date, due_date, folder_id }) as TaskLink

  // The chart holds the task on this side of the link.
  const chart = (task?: TaskLink) => new Map([[task!.id, task!]])

  test('splitDependencies separates links inside a folder from links to other projects', () => {
    const ids = new Set([1, 2])
    const { internal, external } = splitDependencies([dep(1, 2), dep(2, 9), dep(8, 1), dep(8, 9)], ids)
    expect(internal.map((d) => [d.predecessor_id, d.successor_id])).toEqual([[1, 2]])
    expect(external.map((d) => [d.predecessor_id, d.successor_id])).toEqual([[2, 9], [8, 1]])
  })

  test('externalEnd names the other task, its project and which side of the link it is', () => {
    const waitsOnVendor = { ...dep(8, 1), predecessor: link(8, '2026-11-05', 3), successor: link(1, '2026-11-20', 2, '2026-11-10') }
    const end = externalEnd(waitsOnVendor, chart(waitsOnVendor.successor), folders)
    expect(end).toMatchObject({ isPredecessor: true, project: 'Billing', brokenByDays: 0 })
    expect(end.task?.id).toBe(8)

    const waitedOn = { ...dep(1, 9), predecessor: link(1, '2026-11-05', 2), successor: link(9, '2026-11-20', 3) }
    expect(externalEnd(waitedOn, chart(waitedOn.predecessor), folders)).toMatchObject({ isPredecessor: false, project: 'Billing' })
  })

  test('externalEnd reads the task on the chart from the chart, not from the link', () => {
    // The server's copy says task 1 starts on the 20th; the chart has it moved to the 9th, before the vendor finishes.
    const stale = { ...dep(8, 1), predecessor: link(8, '2026-11-12', 3), successor: link(1, '2026-11-30', 2, '2026-11-20') }
    expect(externalEnd(stale, chart(stale.successor), folders).brokenByDays).toBe(0)
    expect(externalEnd(stale, chart(link(1, '2026-11-25', 2, '2026-11-09')), folders).brokenByDays).toBe(3)
  })

  test('externalEnd looks up a project through its subfolders, and has none for a task outside any', () => {
    const inSub = { ...dep(8, 1), predecessor: link(8, null, 2), successor: link(1, null, null) }
    expect(externalEnd(inSub, chart(inSub.successor), folders).project).toBe('Messages')
    const loose = { ...dep(8, 1), predecessor: link(8, null, null), successor: link(1, null, 2) }
    expect(externalEnd(loose, chart(loose.successor), folders).project).toBeNull()
  })

  test('externalEnd counts the days a link is broken by, by its kind', () => {
    // The vendor finishes on the 12th but this task starts on the 9th: three days early.
    const late = { ...dep(8, 1), predecessor: link(8, '2026-11-12', 3, '2026-11-01'), successor: link(1, '2026-11-20', 2, '2026-11-09') }
    expect(externalEnd(late, chart(late.successor), folders).brokenByDays).toBe(3)
    expect(externalEnd({ ...late, kind: 'start_to_start' }, chart(late.successor), folders).brokenByDays).toBe(0)
    // Finishing on the same day the other starts holds.
    const sameDay = { ...dep(8, 1), predecessor: link(8, '2026-11-09', 3), successor: link(1, '2026-11-20', 2, '2026-11-09') }
    expect(externalEnd(sameDay, chart(sameDay.successor), folders).brokenByDays).toBe(0)
    // No dates, nothing to compare.
    const undated = { ...dep(8, 1), predecessor: link(8, null, 3), successor: link(1, '2026-11-20', 2) }
    expect(externalEnd(undated, chart(undated.successor), folders).brokenByDays).toBe(0)
  })

  test('linkCandidates leaves out tasks on the chart and groups the rest by project', () => {
    const task = (id: number, folder_id: number | null, extra: Partial<Task> = {}) =>
      ({ id, title: `T${id}`, folder_id, ...extra }) as unknown as Task
    const found = [
      task(1, 1), task(2, 3), task(3, 2), task(4, null), task(2, 3),
      task(5, null, { document: { folder_id: 3 } as unknown as Task['document'] }),
    ]
    const groups = linkCandidates(found, folders, new Set([1]))
    expect(groups.map((g) => [g.project, g.tasks.map((t) => t.id)])).toEqual([
      ['Billing', [2, 5]],
      ['Messages', [3]],
      [NO_PROJECT, [4]],
    ])
  })
})
