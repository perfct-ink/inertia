import type { Task } from '@/types'
import { buildTaskTree, taskChanges, taskDraft, taskDraftError } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
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
