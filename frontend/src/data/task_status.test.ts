import type { Folder, TaskStatus, TaskStatusSetting } from '@/types'
import {
  BOARD_STATUSES,
  DEFAULT_BOARD_STATUSES,
  TASK_STATUSES,
  boardScope,
  editedFolderId,
  hasOwnSettings,
  inheritedStatuses,
  nextStatusLabel,
  overridesFromStyles,
  resolveStatuses,
} from './task_status'

const setting = (folder_id: number | null, status: TaskStatus, label: string | null, color: TaskStatusSetting['color'] = null, id = 1) =>
  ({ id, folder_id, status, label, color }) as TaskStatusSetting

const folder = (id: number, parent_id: number | null, children: Folder[] = [], root = false) =>
  ({ id, name: `F${id}`, parent_id, root, children, documents: [] }) as unknown as Folder

// Root(1) > Project(2) > Sub(3) > Leaf(4); Other(5) sits directly under Root.
const tree = [folder(1, null, [folder(2, 1, [folder(3, 2, [folder(4, 3)])]), folder(5, 1)], true)]

test('every status has a built-in label and colour, and the board shows four of them', () => {
  expect(TASK_STATUSES).toHaveLength(5)
  expect(BOARD_STATUSES).toEqual(['todo', 'in_progress', 'in_review', 'done'])
  expect(DEFAULT_BOARD_STATUSES.todo).toEqual({ label: 'To Do', color: 'gray' })
  expect(DEFAULT_BOARD_STATUSES.in_progress).toEqual({ label: 'In Progress', color: 'blue' })
  expect(DEFAULT_BOARD_STATUSES.done).toEqual({ label: 'Done', color: 'green' })
})

test('boardScope walks from the folder up to, but not including, Root', () => {
  expect(boardScope(tree, 4)).toEqual([4, 3, 2])
  expect(boardScope(tree, 5)).toEqual([5])
})

test('boardScope is empty for the Space, for Root and for no folder', () => {
  expect(boardScope(tree, null)).toEqual([])
  expect(boardScope(tree, undefined)).toEqual([])
  expect(boardScope(tree, 1)).toEqual([])
})

test('boardScope keeps a folder that is not loaded yet', () => {
  expect(boardScope([], 9)).toEqual([9])
})

test('resolveStatuses is the built-in set when nothing is set', () => {
  expect(resolveStatuses([], [])).toEqual(DEFAULT_BOARD_STATUSES)
  expect(resolveStatuses([], [3, 2])).toEqual(DEFAULT_BOARD_STATUSES)
})

test('the Space default applies to every board', () => {
  const settings = [setting(null, 'in_progress', 'Doing', 'orange')]
  expect(resolveStatuses(settings, []).in_progress).toEqual({ label: 'Doing', color: 'orange' })
  expect(resolveStatuses(settings, [3, 2]).in_progress).toEqual({ label: 'Doing', color: 'orange' })
  expect(resolveStatuses(settings, []).done).toEqual(DEFAULT_BOARD_STATUSES.done)
})

test('the nearest folder wins over its parents and the Space', () => {
  const settings = [
    setting(null, 'todo', 'Space todo', 'red', 1),
    setting(2, 'todo', 'Project todo', 'blue', 2),
    setting(3, 'todo', 'Sub todo', null, 3),
  ]
  expect(resolveStatuses(settings, [3, 2]).todo).toEqual({ label: 'Sub todo', color: 'blue' })
  expect(resolveStatuses(settings, [4, 3, 2]).todo).toEqual({ label: 'Sub todo', color: 'blue' })
  expect(resolveStatuses(settings, [2]).todo).toEqual({ label: 'Project todo', color: 'blue' })
  expect(resolveStatuses(settings, [5]).todo).toEqual({ label: 'Space todo', color: 'red' })
})

test('a folder that only recolours a status still takes its name from above', () => {
  const settings = [setting(null, 'done', 'Shipped'), setting(2, 'done', null, 'purple')]
  expect(resolveStatuses(settings, [2]).done).toEqual({ label: 'Shipped', color: 'purple' })
})

test('settings from other folders do not leak into a board', () => {
  const settings = [setting(5, 'todo', 'Other todo')]
  expect(resolveStatuses(settings, [2]).todo.label).toBe('To Do')
})

test('the edited folder is the nearest one, or null for the Space default', () => {
  expect(editedFolderId([3, 2])).toBe(3)
  expect(editedFolderId([])).toBeNull()
})

test('inheritedStatuses leaves out the board being edited', () => {
  const settings = [
    setting(null, 'todo', 'Space todo', null, 1),
    setting(2, 'todo', 'Project todo', null, 2),
    setting(3, 'todo', 'Sub todo', null, 3),
  ]
  expect(inheritedStatuses(settings, [3, 2]).todo.label).toBe('Project todo')
  expect(inheritedStatuses(settings, [2]).todo.label).toBe('Space todo')
})

test('the Space default inherits only the built-in statuses', () => {
  const settings = [setting(null, 'todo', 'Space todo')]
  expect(inheritedStatuses(settings, [])).toEqual(DEFAULT_BOARD_STATUSES)
})

test('hasOwnSettings is about the board itself, not what it inherits', () => {
  const settings = [setting(null, 'todo', 'Space todo', null, 1), setting(2, 'done', 'Shipped', null, 2)]
  expect(hasOwnSettings(settings, [])).toBe(true)
  expect(hasOwnSettings(settings, [2])).toBe(true)
  expect(hasOwnSettings(settings, [3, 2])).toBe(false)
  expect(hasOwnSettings([], [])).toBe(false)
})

test('overridesFromStyles keeps only what differs from the inherited statuses', () => {
  const inherited = resolveStatuses([setting(null, 'todo', 'Queued', 'red')], [])
  const edited = {
    ...inherited,
    todo: { label: 'Queued', color: 'red' as const },
    in_progress: { label: 'Doing', color: 'blue' as const },
    done: { label: 'Done', color: 'purple' as const },
  }
  expect(overridesFromStyles(edited, inherited)).toEqual([
    { status: 'in_progress', label: 'Doing' },
    { status: 'done', color: 'purple' },
  ])
})

test('overridesFromStyles trims labels and treats an emptied label as inherited', () => {
  const edited = { ...DEFAULT_BOARD_STATUSES, backlog: { label: '  Ideas  ', color: 'gray' as const }, todo: { label: '   ', color: 'gray' as const } }
  expect(overridesFromStyles(edited, DEFAULT_BOARD_STATUSES)).toEqual([{ status: 'backlog', label: 'Ideas' }])
})

test('overridesFromStyles is empty when nothing was changed', () => {
  expect(overridesFromStyles(DEFAULT_BOARD_STATUSES, DEFAULT_BOARD_STATUSES)).toEqual([])
})

test('nextStatusLabel names the status the arrow moves a task to', () => {
  const statuses = resolveStatuses([setting(null, 'in_progress', 'Doing')], [])
  expect(nextStatusLabel(statuses, 'todo')).toBe('Doing')
  expect(nextStatusLabel(statuses, 'in_review')).toBe('Done')
  expect(nextStatusLabel(statuses, 'done')).toBeNull()
})
