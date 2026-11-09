import type { Folder, Task } from '@/types'
import {
  TASK_EMBED_DEFAULTS, embedProgress, embedTasks, filterEmbedTasks, normalizeTaskEmbed, scopeNameIn, scopeNeedsId, sortEmbedTasks,
  taskEmbedAttrsFromElement, taskEmbedDataAttributes, taskEmbedFilters, taskEmbedHeading, unscheduledCount,
  type TaskEmbedAttrs,
} from './taskEmbed'

const task = (id: number, status: Task['status'], due_date: string | null = null, position = id) =>
  ({ id, title: `T${id}`, status, due_date, position }) as unknown as Task

const attrs = (extra: Partial<TaskEmbedAttrs> = {}): TaskEmbedAttrs => ({ ...TASK_EMBED_DEFAULTS, ...extra })

test('a new embed is the open tasks of the whole Space, as a list', () => {
  expect(TASK_EMBED_DEFAULTS).toEqual({ view: 'list', scope: 'space', scopeId: null, status: 'open' })
  expect(normalizeTaskEmbed({})).toEqual(TASK_EMBED_DEFAULTS)
  expect(normalizeTaskEmbed(null)).toEqual(TASK_EMBED_DEFAULTS)
})

test('normalizeTaskEmbed keeps valid attributes and replaces anything else with the default', () => {
  expect(normalizeTaskEmbed({ view: 'gantt', scope: 'sprint', scopeId: 4, status: 'in_review' })).toEqual({
    view: 'gantt', scope: 'sprint', scopeId: 4, status: 'in_review',
  })
  expect(normalizeTaskEmbed({ view: 'kanban', scope: 'everything', scopeId: 4, status: 'blocked' })).toEqual(TASK_EMBED_DEFAULTS)
})

test('an id is a positive whole number, and only a scope that names something keeps one', () => {
  expect(normalizeTaskEmbed({ scope: 'folder', scopeId: '12' }).scopeId).toBe(12)
  for (const bad of [0, -3, 1.5, 'abc', '', null, undefined]) {
    expect(normalizeTaskEmbed({ scope: 'folder', scopeId: bad }).scopeId).toBeNull()
  }
  expect(normalizeTaskEmbed({ scope: 'space', scopeId: 12 }).scopeId).toBeNull()
  expect(scopeNeedsId('space')).toBe(false)
  expect(scopeNeedsId('document')).toBe(false)
  expect(['folder', 'sprint'].every((s) => scopeNeedsId(s as TaskEmbedAttrs['scope']))).toBe(true)
})

test('"this document" stores no id: it is whichever document the embed sits in', () => {
  expect(normalizeTaskEmbed({ scope: 'document', scopeId: 7 })).toEqual({ ...TASK_EMBED_DEFAULTS, scope: 'document', scopeId: null })
})

test('the node keeps only its four settings: no task, title or name is ever stored', () => {
  const stored = normalizeTaskEmbed({
    view: 'list', scope: 'sprint', scopeId: 4, status: 'open',
    tasks: [{ id: 1, title: 'Fire the CEO' }], title: 'Secret roadmap', count: 12,
  })
  expect(Object.keys(stored).sort()).toEqual(['scope', 'scopeId', 'status', 'view'])
  expect(JSON.stringify(stored)).not.toMatch(/CEO|Secret|12/)
  expect(JSON.stringify(taskEmbedDataAttributes(stored))).not.toMatch(/CEO|Secret/)
})

test('the static HTML attributes round trip', () => {
  const chosen = attrs({ view: 'gantt', scope: 'folder', scopeId: 7, status: 'all' })
  const data = taskEmbedDataAttributes(chosen)
  expect(data).toEqual({ 'data-view': 'gantt', 'data-scope': 'folder', 'data-scope-id': '7', 'data-status': 'all' })
  const element = { getAttribute: (name: string) => data[name] ?? null }
  expect(taskEmbedAttrsFromElement(element)).toEqual(chosen)
  expect(taskEmbedDataAttributes(attrs())['data-scope-id']).toBeUndefined()
  expect(taskEmbedAttrsFromElement({ getAttribute: () => null })).toEqual(TASK_EMBED_DEFAULTS)
})

test('taskEmbedFilters names the API filter for the scope, or null until one is chosen', () => {
  expect(taskEmbedFilters(attrs(), 50)).toEqual({})
  expect(taskEmbedFilters(attrs({ scope: 'document' }), 3)).toEqual({ document_id: 3 })
  expect(taskEmbedFilters(attrs({ scope: 'folder', scopeId: 4 }), 50)).toEqual({ folder_id: 4 })
  expect(taskEmbedFilters(attrs({ scope: 'sprint', scopeId: 5 }), 50)).toEqual({ sprint_id: 5 })
  expect(taskEmbedFilters(attrs({ scope: 'folder' }), 50)).toBeNull()
  expect(taskEmbedFilters(attrs({ scope: 'sprint' }), 50)).toBeNull()
  expect(taskEmbedFilters(attrs({ scope: 'document' }), null)).toBeNull()
})

test('taskEmbedHeading says what is shown and where from', () => {
  expect(taskEmbedHeading(attrs(), null)).toBe('Open tasks in this Space')
  expect(taskEmbedHeading(attrs({ status: 'all', scope: 'sprint', scopeId: 1 }), 'Sprint 3')).toBe('All tasks in Sprint 3')
  expect(taskEmbedHeading(attrs({ status: 'in_progress', scope: 'folder', scopeId: 1 }), 'Messages / Design')).toBe('In Progress tasks in Messages / Design')
  expect(taskEmbedHeading(attrs({ scope: 'folder' }), null)).toBe('Open tasks')
})

test('the status filter keeps open tasks, all of them, or one status', () => {
  const tasks = [task(1, 'backlog'), task(2, 'in_progress'), task(3, 'done')]
  expect(filterEmbedTasks(tasks, 'open').map((t) => t.id)).toEqual([1, 2])
  expect(filterEmbedTasks(tasks, 'all').map((t) => t.id)).toEqual([1, 2, 3])
  expect(filterEmbedTasks(tasks, 'done').map((t) => t.id)).toEqual([3])
  expect(filterEmbedTasks(tasks, 'in_review')).toEqual([])
})

test('tasks are listed by due date, those without a date last, then by board order', () => {
  const tasks = [
    task(1, 'todo', null, 1), task(2, 'todo', '2026-11-20', 2), task(3, 'todo', '2026-11-05', 3),
    task(4, 'todo', '2026-11-05', 1), task(5, 'todo', null, 1),
  ]
  expect(sortEmbedTasks(tasks).map((t) => t.id)).toEqual([4, 3, 2, 1, 5])
  // Sorting copies: the list that came from the server is left as it was.
  expect(tasks.map((t) => t.id)).toEqual([1, 2, 3, 4, 5])
  expect(embedTasks([task(1, 'done', '2026-11-01'), task(2, 'todo', '2026-11-09'), task(3, 'todo', '2026-11-02')], 'open').map((t) => t.id)).toEqual([3, 2])
})

test('progress counts every task in the scope, whatever the filter hides', () => {
  expect(embedProgress([task(1, 'done'), task(2, 'todo'), task(3, 'done'), task(4, 'backlog')])).toEqual({ done: 2, total: 4, percent: 50 })
  expect(embedProgress([task(1, 'done'), task(2, 'todo'), task(3, 'todo')]).percent).toBe(33)
  expect(embedProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
})

test('unscheduledCount is the tasks the Gantt cannot draw', () => {
  expect(unscheduledCount([task(1, 'todo'), task(2, 'todo', '2026-11-01'), task(3, 'todo', null)])).toBe(2)
  expect(unscheduledCount([])).toBe(0)
})

test('scopeNameIn finds the folder path or the document title a scope points at', () => {
  const folders = [
    {
      id: 1, name: 'Root', root: true, parent_id: null, position: 0, documents: [{ id: 50, title: 'Plan' }],
      children: [{ id: 2, name: 'Messages', root: false, parent_id: 1, position: 0, documents: [{ id: 60, title: '' }], children: [] }],
    },
  ] as unknown as Folder[]
  expect(scopeNameIn(attrs({ scope: 'folder', scopeId: 2 }), folders, 50)).toBe('Messages')
  expect(scopeNameIn(attrs({ scope: 'folder', scopeId: 1 }), folders, 50)).toBe('Top level')
  expect(scopeNameIn(attrs({ scope: 'document' }), folders, 50)).toBe('Plan')
  expect(scopeNameIn(attrs({ scope: 'document' }), folders, 60)).toBeNull()
  expect(scopeNameIn(attrs({ scope: 'document' }), folders, null)).toBeNull()
  expect(scopeNameIn(attrs({ scope: 'folder', scopeId: 99 }), folders, 50)).toBeNull()
  expect(scopeNameIn(attrs({ scope: 'folder' }), folders, 50)).toBeNull()
  expect(scopeNameIn(attrs({ scope: 'sprint', scopeId: 2 }), folders, 50)).toBeNull()
  expect(scopeNameIn(attrs(), folders, 50)).toBeNull()
})
