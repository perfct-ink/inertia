import { calendarItems } from './calendar'
import type { Task, WorkspaceEvent } from '@/types'

const task = (id: number, title: string, due_date: string | null, status = 'todo') => ({ id, title, due_date, status }) as unknown as Task
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
