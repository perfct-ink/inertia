import type { Task, Document } from '@/types'
import { autoFields, buildTaskTree, TASK_LIST_DEPTHS, taskFolderId, dueBucket, myWork, taskCards, estimateLabel, pointsLabel, priorityLabel, filterByKind, kindOf, elapsedClock, formatMinutes, progressById, subtaskProgress, statusChangeLabel, taskChanges, taskDraft, taskDraftError, parseTaskBoardConfig, epicLanes, epicLaneKey, laneEpicId, boardCellId, parseBoardCell, taskFileSplit, taskUploadFolderId } from './task'

const task =(id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

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

describe('files attached to a task', () => {
  const file = (id: number, title: string) => ({ id, title, doc_type: 'file' }) as unknown as Document
  const files = [file(1, 'zebra.png'), file(2, 'apple.pdf'), file(3, 'Mango.zip')]

  test('taskFileSplit lists attached files in the order they were attached and the rest by name', () => {
    const { attached, available } = taskFileSplit({ file_ids: [3, 1] }, files)
    expect(attached.map((f) => f.id)).toEqual([3, 1])
    expect(available.map((f) => f.id)).toEqual([2])
    expect(taskFileSplit({ file_ids: [] }, files).available.map((f) => f.title)).toEqual(['apple.pdf', 'Mango.zip', 'zebra.png'])
  })

  test('taskFileSplit tolerates a task without file ids and ids of files that are gone', () => {
    expect(taskFileSplit({}, files).attached).toEqual([])
    expect(taskFileSplit({ file_ids: [99, 2] }, files).attached.map((f) => f.id)).toEqual([2])
  })

  test('a file uploaded from a task goes to the task\'s folder, else its document\'s, else Root', () => {
    expect(taskUploadFolderId({ folder_id: 4, document: { folder_id: 9 } } as unknown as Task, 1)).toBe(4)
    expect(taskUploadFolderId({ folder_id: null, document: { folder_id: 9 } } as unknown as Task, 1)).toBe(9)
    expect(taskUploadFolderId({ folder_id: null } as unknown as Task, 1)).toBe(1)
    expect(taskUploadFolderId({ folder_id: null } as unknown as Task, undefined)).toBeNull()
  })
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

test('autoFields shows the item ID, creator and relative times', () => {
  const now = new Date('2026-10-21T12:00:00Z')
  const fields = autoFields({ id: 12, created_by_name: 'Ada', created_at: '2026-10-19T12:00:00Z', updated_at: '2026-10-21T10:00:00Z' }, now)
  expect(fields).toEqual({ itemId: '#12', createdBy: 'Ada', created: '2 days ago', updated: 'about 2 hours ago' })
})

test('autoFields leaves out what the server does not know', () => {
  expect(autoFields({ id: 3 })).toEqual({ itemId: '#3', createdBy: null, created: null, updated: null })
})

test('the list depth options run from top-level tasks only to all levels', () => {
  expect(TASK_LIST_DEPTHS.map((d) => d.maxDepth)).toEqual([0, 1, null])
})

test('a stored Workboard view keeps the filters it understands, leaving unset ones out', () => {
  const stored = { status: 'in_review', kind: 'bug', folder_id: 2, epic_id: 3, sprint_id: 4, assignee_id: 5, q: '  login ' }
  expect(parseTaskBoardConfig(stored)).toEqual({ status: 'in_review', kind: 'bug', folder_id: 2, epic_id: 3, sprint_id: 4, assignee_id: 5, q: 'login' })
  expect(parseTaskBoardConfig({ status: 'todo' })).toEqual({ status: 'todo' })
})

test('a malformed stored Workboard view drops what it cannot use', () => {
  expect(parseTaskBoardConfig(null)).toEqual({})
  expect(parseTaskBoardConfig('nope')).toEqual({})
  expect(parseTaskBoardConfig({ status: 'finished', kind: 'epic', folder_id: '2', epic_id: 1.5, sprint_id: -1, assignee_id: 0, q: '   ', extra: true })).toEqual({})
})

describe('workboard swimlanes', () => {
  const t = (id: number, epic_id: number | null) => ({ id, epic_id }) as unknown as Task
  const epics = [{ id: 1, title: 'Onboarding' }, { id: 2, title: 'Billing' }, { id: 3, title: 'Empty' }]

  test('epicLanes makes a lane per epic with tasks, in the epics\' order, plus No epic', () => {
    const lanes = epicLanes([t(1, 2), t(2, null), t(3, 1), t(4, 99), t(5, 2)], epics)
    expect(lanes.map((l) => [l.key, l.title, l.epicId, l.tasks.map((x) => x.id)])).toEqual([
      ['epic-1', 'Onboarding', 1, [3]],
      ['epic-2', 'Billing', 2, [1, 5]],
      ['no-epic', 'No epic', null, [2, 4]],
    ])
  })

  test('No epic is always a lane, so cards can leave an epic and an empty Space can add a task', () => {
    expect(epicLanes([t(1, 1)], epics).map((l) => [l.key, l.tasks.length])).toEqual([['epic-1', 1], ['no-epic', 0]])
    expect(epicLanes([], epics).map((l) => l.key)).toEqual(['no-epic'])
    expect(epicLanes([t(1, null)], []).map((l) => l.key)).toEqual(['no-epic'])
  })

  test('a lane key and its epic round-trip, and unknown epics fall in No epic', () => {
    const known = new Set([4])
    expect(epicLaneKey(4, known)).toBe('epic-4')
    expect(epicLaneKey(5, known)).toBe('no-epic')
    expect(epicLaneKey(null, known)).toBe('no-epic')
    expect(laneEpicId('epic-4')).toBe(4)
    expect(laneEpicId('no-epic')).toBeNull()
  })

  test('board cell ids are the status on the plain board and lane plus status in a swimlane', () => {
    expect(boardCellId('todo')).toBe('todo')
    expect(boardCellId('in_review', 'epic-3')).toBe('epic-3|in_review')
    expect(parseBoardCell('done')).toEqual({ status: 'done', laneKey: null })
    expect(parseBoardCell('no-epic|todo')).toEqual({ status: 'todo', laneKey: 'no-epic' })
    expect(parseBoardCell(12)).toBeNull()
    expect(parseBoardCell('epic-3|bogus')).toBeNull()
  })
})
