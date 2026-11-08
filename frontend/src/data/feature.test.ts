import { epicFeatureStatus, isFeatureDocument, parentFeatureOptions, readTasksOnly, tasksOnlyKey, writeTasksOnly } from './feature'
import type { Folder } from '@/types'

const folders = [{
  id: 1, name: 'Root', root: true, kind: 'folder', documents: [{ id: 1, title: 'Loose', doc_type: 'document', folder_id: 1 }],
  children: [
    { id: 2, name: 'Features', kind: 'feature', children: [], documents: [{ id: 2, title: 'Zed', doc_type: 'document', folder_id: 2 }, { id: 3, title: 'Alpha', doc_type: 'document', folder_id: 2 }, { id: 4, title: 'Budget', doc_type: 'spreadsheet', folder_id: 2 }] },
  ],
}] as unknown as Folder[]

test('parent options are the ordinary documents of feature folders, by title, without the feature itself', () => {
  expect(parentFeatureOptions(folders).map((d) => d.title)).toEqual(['Alpha', 'Zed'])
  expect(parentFeatureOptions(folders, 3).map((d) => d.title)).toEqual(['Zed'])
})

test('a document is a feature when its folder is a feature folder', () => {
  expect(isFeatureDocument(folders, { folder_id: 2 })).toBe(true)
  expect(isFeatureDocument(folders, { folder_id: 1 })).toBe(false)
  expect(isFeatureDocument(folders, { folder_id: 99 })).toBe(false)
})

test('an epic feature is planned with no tasks or none done, active when some are done, done when all are', () => {
  expect(epicFeatureStatus({ tasks_count: 0, done_tasks_count: 0 })).toBe('planned')
  expect(epicFeatureStatus({ tasks_count: 4, done_tasks_count: 0 })).toBe('planned')
  expect(epicFeatureStatus({ tasks_count: 4, done_tasks_count: 1 })).toBe('active')
  expect(epicFeatureStatus({ tasks_count: 4, done_tasks_count: 4 })).toBe('done')
})

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) },
    data,
  }
}

test('the tasks-only choice is stored per person and per feature', () => {
  const storage = memoryStorage()
  expect(tasksOnlyKey(5, 9)).not.toBe(tasksOnlyKey(6, 9))
  expect(tasksOnlyKey(5, 9)).not.toBe(tasksOnlyKey(5, 10))
  expect(readTasksOnly(storage, tasksOnlyKey(5, 9))).toBe(false)
  writeTasksOnly(storage, tasksOnlyKey(5, 9), true)
  expect(readTasksOnly(storage, tasksOnlyKey(5, 9))).toBe(true)
  expect(readTasksOnly(storage, tasksOnlyKey(5, 10))).toBe(false)
  writeTasksOnly(storage, tasksOnlyKey(5, 9), false)
  expect(readTasksOnly(storage, tasksOnlyKey(5, 9))).toBe(false)
  expect(storage.data.size).toBe(0)
})

test('blocked storage does not break the toggle', () => {
  const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
  expect(readTasksOnly(blocked, 'k')).toBe(false)
  expect(() => writeTasksOnly(blocked, 'k', true)).not.toThrow()
  expect(() => writeTasksOnly(blocked, 'k', false)).not.toThrow()
})
