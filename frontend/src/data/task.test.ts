import type { Task } from '@/types'
import { buildTaskTree, taskFolderId, dueBucket, myWork, taskCards, estimateLabel, pointsLabel, priorityLabel, filterByKind, kindOf, elapsedClock, formatMinutes, progressById, subtaskProgress, statusChangeLabel, taskChanges, taskDraft, taskDraftError, taskSummary, upcomingTasks } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('taskFolderId is the task\'s own folder, else its document\'s', () => {
  expect(taskFolderId({ folder_id: 3, document: { folder_id: 9 } } as unknown as Task)).toBe(3)
  expect(taskFolderId({ folder_id: null, document: { folder_id: 9 } } as unknown as Task)).toBe(9)
  expect(taskFolderId({ folder_id: null } as unknown as Task)).toBeNull()
})

test('dueBucket sorts dates against today, with the week being the next six days', () => {
  expect(dueBucket(null, '2026-10-19')).toBe('no_date')
  expect(dueBucket('2026-10-18', '2026-10-19')).toBe('overdue')
  expect(dueBucket('2026-10-19', '2026-10-19')).toBe('today')
  expect(dueBucket('2026-10-25', '2026-10-19')).toBe('this_week')
  expect(dueBucket('2026-10-26', '2026-10-19')).toBe('later')
  expect(dueBucket('2026-11-02', '2026-10-30')).toBe('this_week')
})

test('myWork groups my open tasks by due date and skips done and other people', () => {
  const t = (id: number, assignee_id: number | null, due_date: string | null, status = 'todo', title = `T${id}`) =>
    ({ id, title, assignee_id, due_date, status }) as unknown as Task
  const groups = myWork([
    t(1, 5, '2026-10-30'), t(2, 5, '2026-10-17'), t(3, 6, '2026-10-17'), t(4, 5, null), t(5, 5, '2026-10-19', 'done'),
    t(6, 5, '2026-10-17', 'todo', 'A first'),
  ], 5, '2026-10-19')
  expect(groups.map((g) => g.bucket)).toEqual(['overdue', 'later', 'no_date'])
  expect(groups[0].tasks.map((x) => x.id)).toEqual([6, 2])
  expect(myWork([], 5, '2026-10-19')).toEqual([])
})

test('every task status has a label', async () => {
  const { TASK_STATUSES, STATUS_LABEL } = await import('./task')
  expect(TASK_STATUSES).toEqual(['backlog', 'todo', 'in_progress', 'in_review', 'done'])
  for (const status of TASK_STATUSES) expect(STATUS_LABEL[status]).toBeTruthy()
})

test('taskCards makes one card per top-level task with epic, subtask progress and overdue', () => {
  const t = (id: number, extra: Partial<Task> = {}) => ({ id, title: `T${id}`, status: 'todo', parent_id: null, epic_id: null, due_date: null, ...extra }) as unknown as Task
  const cards = taskCards(
    [t(1, { epic_id: 7, due_date: '2026-10-01' }), t(2, { parent_id: 1, status: 'done' }), t(3, { parent_id: 2 }), t(4, { status: 'done', due_date: '2026-09-01' })],
    [{ id: 7, title: 'Launch' }],
    '2026-10-19',
  )
  expect(cards.map((c) => c.task.id)).toEqual([1, 4])
  expect(cards[0]).toMatchObject({ epicTitle: 'Launch', subtasks: { done: 1, total: 2 }, overdue: true })
  expect(cards[1]).toMatchObject({ epicTitle: null, subtasks: { done: 0, total: 0 }, overdue: false })
})

test('priorityLabel hides none, pointsLabel and estimateLabel format what is set', () => {
  expect(priorityLabel('none')).toBeNull()
  expect(priorityLabel(undefined)).toBeNull()
  expect(priorityLabel('urgent')).toBe('Urgent')
  expect(pointsLabel({ story_points: 5, actual_story_points: null })).toBe('5 pts')
  expect(pointsLabel({ story_points: 5, actual_story_points: 8 })).toBe('5 → 8 pts')
  expect(pointsLabel({ story_points: null, actual_story_points: 3 })).toBe('3 pts actual')
  expect(pointsLabel({ story_points: null, actual_story_points: null })).toBeNull()
  expect(pointsLabel({ story_points: 0, actual_story_points: null })).toBe('0 pts')
  expect(estimateLabel(6.5)).toBe('6.5 h')
  expect(estimateLabel(null)).toBeNull()
})

test('a task with no kind is a plain task', () => {
  expect(kindOf({})).toBe('task')
  expect(kindOf({ kind: 'bug' })).toBe('bug')
})

test('filterByKind builds the bugs queue and passes everything through without a kind', () => {
  const items = [{ id: 1, kind: 'bug' as const }, { id: 2 }, { id: 3, kind: 'story' as const }, { id: 4, kind: 'bug' as const }]
  expect(filterByKind(items, 'bug').map((t) => t.id)).toEqual([1, 4])
  expect(filterByKind(items, 'task').map((t) => t.id)).toEqual([2])
  expect(filterByKind(items)).toHaveLength(4)
})

const withStatus = (id: number, parent_id: number | null, status: Task['status']) =>
  ({ id, title: `T${id}`, parent_id, status }) as unknown as Task

test('progress counts every descendant, to any depth, and skips tasks with no subtasks', () => {
  const tasks = [
    withStatus(1, null, 'todo'),
    withStatus(2, 1, 'done'),
    withStatus(3, 1, 'in_progress'),
    withStatus(4, 3, 'done'),
    withStatus(5, null, 'done'),
  ]
  expect(subtaskProgress(buildTaskTree(tasks)[0])).toEqual({ done: 2, total: 3, percent: 67 })
  const byId = progressById(tasks)
  expect(byId.get(3)).toEqual({ done: 1, total: 1, percent: 100 })
  expect(byId.has(5)).toBe(false)
  expect(byId.has(2)).toBe(false)
})

test('formatMinutes', () => {
  expect([0, 45, 60, 135, -5].map(formatMinutes)).toEqual(['0m', '45m', '1h', '2h 15m', '0m'])
})

test('elapsedClock shows hours, minutes and seconds since the start', () => {
  expect(elapsedClock('2026-10-21T10:00:00Z', new Date('2026-10-21T11:05:09Z'))).toBe('1:05:09')
  expect(elapsedClock('2026-10-21T10:00:00Z', new Date('2026-10-21T09:00:00Z'))).toBe('0:00:00')
})

test('statusChangeLabel reads the creation row and transitions', () => {
  expect(statusChangeLabel({ from_status: null, to_status: 'todo' })).toBe('Created as To Do')
  expect(statusChangeLabel({ from_status: 'in_review', to_status: 'done' })).toBe('In Review → Done')
})

describe('task detail drafts', () => {
  const base = { id: 1, title: 'Ship', description: null, status: 'todo', start_date: null, due_date: '2026-10-20', epic_id: 3, sprint_id: null, milestone_id: null } as unknown as Task

  test('an untouched draft changes nothing', () => {
    expect(taskChanges(base, taskDraft(base))).toEqual({})
  })

  test('changes carry only edited fields; cleared values become null; ids become numbers', () => {
    const draft = { ...taskDraft(base), title: ' Ship it ', due_date: '', milestone_id: '9', epic_id: '', description: 'Notes', status: 'done' as const }
    expect(taskChanges(base, draft)).toEqual({ title: 'Ship it', due_date: null, milestone_id: 9, epic_id: null, description: 'Notes', status: 'done' })
  })

  test('a blank title or a due date before the start cannot be saved', () => {
    expect(taskDraftError({ ...taskDraft(base), title: '  ' })).toBe('A task needs a title.')
    expect(taskDraftError({ ...taskDraft(base), start_date: '2026-10-25' })).toBe('The due date is before the start date.')
    expect(taskDraftError(taskDraft(base))).toBeNull()
  })
})

describe('taskSummary', () => {
  const make = (id: number, status: Task['status'], due_date: string | null = null) =>
    ({ id, title: `T${id}`, status, due_date }) as unknown as Task
  const tasks = [
    make(1, 'done', '2026-10-01'),
    make(2, 'todo', '2026-10-30'),
    make(3, 'in_progress', '2026-11-02'),
    make(4, 'backlog', '2026-11-08'),
    make(5, 'in_review', '2026-11-20'),
    make(6, 'todo'),
  ]

  test('counts finished, late and soon-due tasks, ignoring the finished ones for lateness', () => {
    expect(taskSummary(tasks, '2026-11-02')).toEqual({
      total: 6, done: 1, open: 5, overdue: 1, due_soon: 2, percent: 17,
      by_status: { backlog: 1, todo: 2, in_progress: 1, in_review: 1, done: 1 },
    })
  })

  test('an empty list is all zeros', () => {
    expect(taskSummary([], '2026-11-02')).toMatchObject({ total: 0, open: 0, percent: 0, overdue: 0 })
  })

  test('upcomingTasks lists open dated tasks soonest first, up to the limit', () => {
    expect(upcomingTasks(tasks).map((t) => t.id)).toEqual([2, 3, 4, 5])
    expect(upcomingTasks(tasks, 2).map((t) => t.id)).toEqual([2, 3])
  })
})
