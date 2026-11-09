import { SAVED_VIEW_PAGES, canChangeSavedView, groupSavedViews, sameConfig, savedViewLabel, type SavedView } from './savedView'

const view = (id: number, name: string, extra: Partial<SavedView> = {}): SavedView =>
  ({ id, page: 'task_table', name, config: {}, shared: false, user_id: 5, owner_name: 'Pat', created_at: '', updated_at: '', ...extra })

test('the pages that keep views', () => {
  expect([...SAVED_VIEW_PAGES]).toEqual(['task_table', 'pivot', 'calendar', 'gantt', 'tasks'])
})

test('a view is yours to change, or an admin\'s or owner\'s when it is shared', () => {
  const mine = view(1, 'Mine')
  const theirsPrivate = view(2, 'Theirs', { user_id: 9 })
  const theirsShared = view(3, 'Shared', { user_id: 9, shared: true })
  expect(canChangeSavedView(mine, 5, 'viewer')).toBe(true)
  expect(canChangeSavedView(theirsShared, 5, 'member')).toBe(false)
  expect(canChangeSavedView(theirsShared, 5, 'admin')).toBe(true)
  expect(canChangeSavedView(theirsShared, 5, 'owner')).toBe(true)
  expect(canChangeSavedView(theirsPrivate, 5, 'admin')).toBe(false)
  expect(canChangeSavedView(theirsShared, undefined, null)).toBe(false)
})

test('groups your views first and other people\'s shared ones second, each by name', () => {
  const views = [
    view(1, 'banana'),
    view(2, 'Apple', { shared: true }),
    view(3, 'Zed', { user_id: 9, shared: true }),
    view(4, 'Cherry', { user_id: 8, shared: true }),
    view(5, 'Hidden', { user_id: 9 }),
  ]
  const groups = groupSavedViews(views, 5)
  expect(groups.mine.map((v) => v.name)).toEqual(['Apple', 'banana'])
  expect(groups.shared.map((v) => v.name)).toEqual(['Cherry', 'Zed'])
})

test('labels tag your shared views and name the owner of other people\'s', () => {
  expect(savedViewLabel(view(1, 'Mine'), 5)).toBe('Mine')
  expect(savedViewLabel(view(2, 'Mine', { shared: true }), 5)).toBe('Mine (shared)')
  expect(savedViewLabel(view(3, 'Team', { user_id: 9, owner_name: 'Sam', shared: true }), 5)).toBe('Team (Sam)')
})

test('configs are the same whatever order their keys are in', () => {
  expect(sameConfig({ a: 1, hidden: ['x', 'y'] }, { hidden: ['x', 'y'], a: 1 })).toBe(true)
  expect(sameConfig({ hidden: ['x', 'y'] }, { hidden: ['y', 'x'] })).toBe(false)
  expect(sameConfig({ a: 1 }, { a: 2 })).toBe(false)
  expect(sameConfig({ a: { b: true } }, { a: { b: true } })).toBe(true)
  expect(sameConfig({ a: 1 }, { a: 1, b: 2 })).toBe(false)
})
