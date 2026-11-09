import type { Document, Epic, Folder, Initiative, Milestone, Sprint, Task } from '@/types'
import { buildDashboard, dashboardPath, findFolder, resolveScope, scopeChoices, subtreeIds, taskBoardPath, type DashboardInput } from './dashboard'

const today = '2026-11-02'

const doc = (id: number, folder_id: number) => ({ id, title: `Doc ${id}`, folder_id, doc_type: 'document' }) as unknown as Document
const folder = (id: number, name: string, extra: Partial<Folder> = {}): Folder =>
  ({ id, name, kind: 'folder', parent_id: null, position: id, archived: false, documents: [], children: [], ...extra }) as unknown as Folder

// Root > Messages (project) > Design, and Root > Billing; Archive is archived.
const folders = (): Folder[] => [
  folder(1, 'Root', {
    root: true,
    documents: [doc(1, 1)],
    children: [
      folder(2, 'Messages', {
        kind: 'project', parent_id: 1, documents: [doc(2, 2)],
        children: [folder(3, 'Design', { parent_id: 2, documents: [doc(3, 3), doc(4, 3)] })],
      }),
      folder(4, 'Billing', { parent_id: 1 }),
      folder(5, 'Archive', { parent_id: 1, archived: true }),
    ],
  }),
]

const task = (id: number, folder_id: number | null, status: Task['status'] = 'todo', due_date: string | null = null, extra: Partial<Task> = {}) =>
  ({ id, title: `Task ${id}`, folder_id, status, due_date, ...extra }) as unknown as Task

const milestone = (id: number, folder_id: number | null, extra: Partial<Milestone> = {}) =>
  ({ id, title: `M${id}`, folder_id, status: 'active', health: 'on_track', target_date: null, ...extra }) as unknown as Milestone

const initiative = (id: number, folder_id: number | null, extra: Partial<Initiative> = {}) =>
  ({ id, title: `I${id}`, folder_id, status: 'active', horizon: null, start_date: null, target_date: null, tasks_count: 0, done_tasks_count: 0, ...extra }) as unknown as Initiative

const epic = (id: number, folder_id: number | null, extra: Partial<Epic> = {}) =>
  ({ id, title: `E${id}`, folder_id, initiative_id: null, horizon: 'later', start_date: null, target_date: null, tasks_count: 0, done_tasks_count: 0, ...extra }) as unknown as Epic

const sprint = (id: number, folder_id: number | null, status: Sprint['status'], extra: Partial<Sprint> = {}) =>
  ({ id, title: `S${id}`, folder_id, status, tasks_count: 4, done_tasks_count: 1, ...extra }) as unknown as Sprint

const input = (extra: Partial<DashboardInput> = {}): DashboardInput => ({
  folders: folders(),
  tasks: [
    task(1, 2, 'done'),
    task(2, 2, 'todo', '2026-10-30'),
    task(3, 3, 'in_progress'),
    task(4, 4, 'todo', '2026-11-04'),
    task(5, null, 'todo'),
    task(6, null, 'todo', null, { document: doc(9, 3) as Document }),
  ],
  milestones: [milestone(1, 2, { health: 'at_risk', target_date: '2026-12-01' }), milestone(2, 4), milestone(3, null, { health: 'off_track' })],
  // Growth is in Messages; the epic is Billing's own, with no initiative.
  initiatives: [initiative(1, 2)],
  epics: [epic(1, 4)],
  sprints: [sprint(1, 2, 'active'), sprint(2, null, 'planned'), sprint(3, 4, 'done')],
  ...extra,
})

test('findFolder finds a folder by id but never the Root', () => {
  expect(findFolder(folders(), 3)?.name).toBe('Design')
  expect(findFolder(folders(), 1)).toBeNull()
  expect(findFolder(folders(), 99)).toBeNull()
  expect(findFolder(folders(), null)).toBeNull()
})

test('findFolder treats an archived folder as gone', () => {
  expect(findFolder(folders(), 5)).toBeNull()
})

describe('resolveScope', () => {
  test('is the asked-for folder, else the whole Space', () => {
    expect(resolveScope(folders(), 4)?.name).toBe('Billing')
    expect(resolveScope(folders(), null)).toBeNull()
    expect(resolveScope(folders(), 99)).toBeNull()
  })

  test('with a project open, is the project, or a folder inside it when asked for', () => {
    expect(resolveScope(folders(), null, 2)?.name).toBe('Messages')
    expect(resolveScope(folders(), 3, 2)?.name).toBe('Design')
  })

  test('with a project open, ignores a folder outside it', () => {
    expect(resolveScope(folders(), 4, 2)?.name).toBe('Messages')
  })

  test('a project that is gone is the whole Space', () => {
    expect(resolveScope(folders(), null, 99)).toBeNull()
  })
})

test('subtreeIds holds the folder and everything nested under it', () => {
  expect([...subtreeIds(findFolder(folders(), 2)!)]).toEqual([2, 3])
})

test('scopeChoices lists active folders by path, without the Root or archived ones', () => {
  expect(scopeChoices(folders())).toEqual([
    { id: 2, label: 'Messages' },
    { id: 3, label: 'Messages / Design' },
    { id: 4, label: 'Billing' },
  ])
})

test('scopeChoices inside a project lists only what is in it, not the project itself', () => {
  expect(scopeChoices(folders(), 2)).toEqual([{ id: 3, label: 'Messages / Design' }])
  expect(scopeChoices(folders(), 4)).toEqual([])
})

describe('across the whole Space', () => {
  const dashboard = buildDashboard(input(), null, today)

  test('rolls up every task, file and milestone', () => {
    expect(dashboard.scope).toBeNull()
    expect(dashboard.files).toBe(4)
    expect(dashboard.tasks).toMatchObject({ total: 6, done: 1, open: 5, overdue: 1, due_soon: 1 })
    expect(dashboard.milestones.total).toBe(3)
    expect(dashboard.milestones.health).toEqual({ on_track: 1, at_risk: 1, off_track: 1 })
    expect(dashboard.milestones.next?.id).toBe(1)
    expect(dashboard.upcoming.map((t) => t.id)).toEqual([2, 4])
  })

  test('lists the top-level folders, archived ones left out, each counting what is nested in it', () => {
    expect(dashboard.folders.map((r) => r.folder.name)).toEqual(['Messages', 'Billing'])
    const [messages, billing] = dashboard.folders
    expect(messages.files).toBe(3)
    expect(messages.tasks).toMatchObject({ total: 4, done: 1, overdue: 1, percent: 25 })
    expect(billing.files).toBe(0)
    expect(billing.tasks).toMatchObject({ total: 1, due_soon: 1 })
  })

  test('counts the roadmap board columns', () => {
    expect(dashboard.roadmap).toEqual({ now: 1, next: 0, later: 1 })
  })

  test('rolls up the sprints, with the active one and how far along it is', () => {
    expect(dashboard.sprints.total).toBe(3)
    expect(dashboard.sprints.counts).toEqual({ planned: 1, active: 1, done: 1 })
    expect(dashboard.sprints.active?.sprint.id).toBe(1)
    expect(dashboard.sprints.active?.percent).toBe(25)
  })
})

describe('limited to a folder', () => {
  const dashboard = buildDashboard(input(), 2, today)

  test('only counts what is in the folder and its subfolders, by the task folder or its document folder', () => {
    expect(dashboard.scope?.name).toBe('Messages')
    expect(dashboard.files).toBe(3)
    expect(dashboard.tasks.total).toBe(4)
    expect(dashboard.milestones.total).toBe(1)
    expect(dashboard.upcoming.map((t) => t.id)).toEqual([2])
  })

  test('lists the subfolders', () => {
    expect(dashboard.folders.map((r) => r.folder.name)).toEqual(['Design'])
    expect(dashboard.folders[0].tasks.total).toBe(2)
  })

  test('counts only the roadmap items and sprints filed in the folder', () => {
    expect(dashboard.roadmap).toEqual({ now: 1, next: 0, later: 0 })
    expect(dashboard.sprints.total).toBe(1)
    expect(dashboard.sprints.active?.sprint.id).toBe(1)
    expect(buildDashboard(input(), 4, today).roadmap).toEqual({ now: 0, next: 0, later: 1 })
    expect(buildDashboard(input(), 4, today).sprints.active).toBeNull()
  })

  test('an epic whose initiative is outside the folder stands alone on the board', () => {
    const scoped = buildDashboard(input({ initiatives: [initiative(1, 4)], epics: [epic(2, 2, { initiative_id: 1 })] }), 2, today)
    expect(scoped.roadmap).toEqual({ now: 0, next: 0, later: 1 })
  })
})

describe('inside an open project', () => {
  test('covers the project and lists its subfolders, as a folder dashboard does', () => {
    const dashboard = buildDashboard(input(), null, today, 2)
    expect(dashboard.scope?.name).toBe('Messages')
    expect(dashboard.tasks.total).toBe(4)
    expect(dashboard.folders.map((r) => r.folder.name)).toEqual(['Design'])
  })

  test('can narrow to a folder in the project, but not to one outside it', () => {
    expect(buildDashboard(input(), 3, today, 2).scope?.name).toBe('Design')
    expect(buildDashboard(input(), 4, today, 2).scope?.name).toBe('Messages')
  })
})

test('a folder that is gone falls back to the whole Space', () => {
  expect(buildDashboard(input(), 99, today).scope).toBeNull()
})

test('an empty Space is all zeros', () => {
  const dashboard = buildDashboard({ folders: [], tasks: [], milestones: [], initiatives: [], epics: [], sprints: [] }, null, today)
  expect(dashboard).toMatchObject({ files: 0, folders: [], upcoming: [], milestones: { total: 0, next: null }, sprints: { total: 0, active: null } })
  expect(dashboard.tasks.total).toBe(0)
})

test('paths for the board link and the scoped dashboard', () => {
  expect(taskBoardPath(null)).toBe('/tasks?view=kanban')
  expect(taskBoardPath(4)).toBe('/tasks?view=kanban&folder_id=4')
  expect(dashboardPath(null)).toBe('/dashboard')
  expect(dashboardPath(4)).toBe('/dashboard?folder=4')
})
