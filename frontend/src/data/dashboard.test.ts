import type { Document, Epic, Folder, Initiative, Milestone, Task } from '@/types'
import { buildDashboard, dashboardPath, findFolder, scopeChoices, subtreeIds, taskBoardPath, type DashboardInput } from './dashboard'

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
  initiatives: [{ id: 1, status: 'active', horizon: null, start_date: null, target_date: null, tasks_count: 0, done_tasks_count: 0 }] as unknown as Initiative[],
  epics: [] as Epic[],
  ...extra,
})

test('findFolder finds a folder by id but never the Root', () => {
  expect(findFolder(folders(), 3)?.name).toBe('Design')
  expect(findFolder(folders(), 1)).toBeNull()
  expect(findFolder(folders(), 99)).toBeNull()
  expect(findFolder(folders(), null)).toBeNull()
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
    expect(dashboard.roadmap).toEqual({ now: 1, next: 0, later: 0 })
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

  test('lists the subfolders and drops the Space-wide roadmap', () => {
    expect(dashboard.folders.map((r) => r.folder.name)).toEqual(['Design'])
    expect(dashboard.folders[0].tasks.total).toBe(2)
    expect(dashboard.roadmap).toBeNull()
  })
})

test('a folder that is gone falls back to the whole Space', () => {
  expect(buildDashboard(input(), 99, today).scope).toBeNull()
})

test('an empty Space is all zeros', () => {
  const dashboard = buildDashboard({ folders: [], tasks: [], milestones: [], initiatives: [], epics: [] }, null, today)
  expect(dashboard).toMatchObject({ files: 0, folders: [], upcoming: [], milestones: { total: 0, next: null } })
  expect(dashboard.tasks.total).toBe(0)
})

test('paths for the board link and the scoped dashboard', () => {
  expect(taskBoardPath(null)).toBe('/tasks?view=kanban')
  expect(taskBoardPath(4)).toBe('/tasks?view=kanban&folder_id=4')
  expect(dashboardPath(null)).toBe('/dashboard')
  expect(dashboardPath(4)).toBe('/dashboard?folder=4')
})
