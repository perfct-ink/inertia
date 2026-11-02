import type { Document } from '@/types'
import { buildInitialContent, extractTitle, lastModified, selectionTaskTitle, taskListContent, DOC_TYPE_LABELS } from './document'

test('extractTitle reads the leading heading', () => {
  expect(extractTitle(buildInitialContent('Launch plan'))).toBe('Launch plan')
})

test('extractTitle falls back to Untitled', () => {
  expect(extractTitle({ content: [{ type: 'paragraph' }] })).toBe('Untitled')
  expect(extractTitle(buildInitialContent(''))).toBe('Untitled')
  expect(extractTitle({})).toBe('Untitled')
})

test('lastModified prefers the content timestamp', () => {
  expect(lastModified({ content_updated_at: '2026-02-01', updated_at: '2026-03-01' } as Document)).toBe('2026-02-01')
  expect(lastModified({ content_updated_at: null, updated_at: '2026-03-01' } as Document)).toBe('2026-03-01')
})

test('users see tables as Collections', () => {
  expect(DOC_TYPE_LABELS.table).toBe('Collection')
})

test('selectionTaskTitle collapses whitespace and rejects an empty selection', () => {
  expect(selectionTaskTitle('  Users can\n  export   a report ')).toBe('Users can export a report')
  expect(selectionTaskTitle('   \n ')).toBeNull()
})

test('taskListContent is a task list with one task line holding the text', () => {
  expect(taskListContent('Export a report')).toEqual({
    type: 'workspaceTaskList',
    content: [{ type: 'workspaceTaskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export a report' }] }] }],
  })
})
