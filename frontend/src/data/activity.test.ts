import { ACTIVITY_LIMIT, activityActor, activityLines, describeChange, formatActivityValue } from './activity'
import type { Activity } from '@/types'

function entry(overrides: Partial<Activity>): Activity {
  return { id: 1, action: 'updated', actor_name: 'Pat', created_at: '2026-11-01T15:30:00', changes: {}, ...overrides }
}

test('a creation reads as created this item, named for the kind of item', () => {
  expect(activityLines(entry({ action: 'created' }), 'Task')).toEqual(['Created this task'])
  expect(activityLines(entry({ action: 'created' }), 'Document')).toEqual(['Created this file'])
})

test('a status change uses the labels the app shows', () => {
  expect(describeChange('status', ['todo', 'in_progress'])).toBe('Changed status from To Do to In Progress')
  expect(describeChange('doc_type', ['document', 'table'])).toBe('Changed type from Document to Collection')
})

test('setting and clearing a field say what it was', () => {
  expect(describeChange('assignee', [null, 'Ada'])).toBe('Set assignee to Ada')
  expect(describeChange('epic', ['Launch', null])).toBe('Cleared epic (was Launch)')
})

test('priority and points read naturally', () => {
  expect(describeChange('priority', ['none', 'urgent'])).toBe('Changed priority from No priority to Urgent')
  expect(describeChange('story_points', [3, 5])).toBe('Changed story points from 3 to 5')
  expect(describeChange('estimate_hours', [null, '2.5'])).toBe('Set estimate (hours) to 2.5')
  expect(describeChange('doc_type', ['document', 'file'])).toBe('Changed type from Document to File')
})

test('task type, repeat rule and feature status use the labels the app shows', () => {
  expect(describeChange('kind', ['task', 'bug'])).toBe('Changed type from Task to Bug')
  expect(describeChange('recurrence', [null, 'FREQ=WEEKLY'])).toBe('Set repeat to Weekly')
  expect(describeChange('recurrence', ['FREQ=WEEKLY;INTERVAL=3', null])).toBe('Cleared repeat (was Every 3 weeks)')
  expect(describeChange('feature_status', [null, 'active'])).toBe('Set feature status to Active')
  expect(describeChange('horizon', ['now', 'later'])).toBe('Changed horizon from Now to Later')
  expect(describeChange('actual_story_points', [null, 8])).toBe('Set actual story points to 8')
})

test('a status change on a planning item uses the planning words', () => {
  expect(describeChange('status', ['planned', 'active'])).toBe('Changed status from Planned to Active')
})

test('titles are quoted and dates are written out', () => {
  expect(describeChange('title', ['Ship', 'Ship it'])).toBe('Changed title from "Ship" to "Ship it"')
  expect(describeChange('due_date', [null, '2026-11-05'])).toBe('Set due date to Nov 5, 2026')
  expect(describeChange('start_date', ['2026-01-09', '2026-12-31'])).toBe('Changed start date from Jan 9, 2026 to Dec 31, 2026')
})

test('a field whose value is not kept reads as edited', () => {
  expect(describeChange('description', null)).toBe('Edited the description')
  expect(describeChange('content', null)).toBe('Edited the content')
})

test('a parent task and flags read naturally', () => {
  expect(describeChange('parent', [null, 'Release'])).toBe('Set parent task to Release')
  expect(describeChange('pinned', [false, true])).toBe('Changed pinned from No to Yes')
  expect(formatActivityValue('pinned', null)).toBe('')
})

test('an update lists one line per change, in the order logged', () => {
  const lines = activityLines(entry({ changes: { status: ['todo', 'done'], assignee: [null, 'Ada'], description: null } }), 'Task')
  expect(lines).toEqual(['Changed status from To Do to Done', 'Set assignee to Ada', 'Edited the description'])
})

test('work without a name is attributed to someone', () => {
  expect(activityActor(entry({}))).toBe('Pat')
  expect(activityActor(entry({ actor_name: null }))).toBe('Someone')
})

test('the page size matches the server', () => {
  expect(ACTIVITY_LIMIT).toBe(100)
})
