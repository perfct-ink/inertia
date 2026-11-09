import { calendarItems } from './calendar'
import type { DocumentDate, Task, WorkspaceEvent } from '@/types'

const task = (id: number, title: string, due_date: string | null, status = 'todo') => ({ id, title, due_date, status }) as unknown as Task
const docDate = (id: number, label: string, date: string, document_id: number | null = 9) => ({ id, label, date, document_id, document_title: 'Plan' }) as unknown as DocumentDate
const event = (id: number, title: string, date: string) => ({ id, title, date }) as unknown as WorkspaceEvent

test('puts tasks on their due date and events on their date, tasks first', () => {
  const items = calendarItems([task(1, 'Zed', '2026-11-05'), task(2, 'Alpha', '2026-11-05', 'done'), task(3, 'No date', null)], [event(9, 'Launch', '2026-11-05'), event(10, 'Other', '2026-11-06')])
  expect(items.get('2026-11-05')?.map((i) => [i.kind, i.title, i.done])).toEqual([['task', 'Alpha', true], ['task', 'Zed', false], ['event', 'Launch', false]])
  expect(items.get('2026-11-06')?.map((i) => i.title)).toEqual(['Other'])
  expect(items.size).toBe(2)
})

test('either kind can be hidden', () => {
  const tasks = [task(1, 'A', '2026-11-05')]
  const events = [event(9, 'E', '2026-11-05')]
  expect(calendarItems(tasks, events, false, true).get('2026-11-05')?.map((i) => i.kind)).toEqual(['event'])
  expect(calendarItems(tasks, events, true, false).get('2026-11-05')?.map((i) => i.kind)).toEqual(['task'])
  expect(calendarItems(tasks, events, false, false).size).toBe(0)
})

test('date chips from documents go on their day after tasks and events, linking to their chip', () => {
  const items = calendarItems([task(1, 'Zed', '2026-11-05')], [event(9, 'Launch', '2026-11-05')], true, true, [docDate(3, 'Ship the beta', '2026-11-05'), docDate(4, 'Kept', '2026-11-05', null)])
  expect(items.get('2026-11-05')?.map((i) => [i.kind, i.title, i.href])).toEqual([
    ['task', 'Zed', null],
    ['event', 'Launch', null],
    ['date', 'Kept', null],
    ['date', 'Ship the beta', '/documents/9#date%3D3'],
  ])
  expect(items.get('2026-11-05')?.[3].entry?.id).toBe(3)
})

test('dates can be hidden on their own', () => {
  const dates = [docDate(3, 'Ship', '2026-11-05')]
  expect(calendarItems([], [], true, true, dates, false).size).toBe(0)
  expect(calendarItems([], [], false, false, dates).get('2026-11-05')?.map((i) => i.kind)).toEqual(['date'])
})
