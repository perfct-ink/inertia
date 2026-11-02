import { ganttExportLayout } from '@/data/ganttExport'
import { paintGantt } from './ganttCanvas'
import type { Scheduled } from '@/data/schedule'

function recorder() {
  const calls: string[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, prop: string) => (prop in target ? target[prop] : (...args: unknown[]) => { calls.push(`${prop}:${args.map(String).join(',')}`) }),
    set: (target, prop: string, value) => { target[prop] = value; if (prop === 'fillStyle' || prop === 'strokeStyle') calls.push(`${prop}=${value}`); return true },
  })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const palette = { background: '#fff', text: '#000', muted: '#888', bar: '#cde', done: '#0a0', critical: '#f00', today: '#f00' }
const item = (title: string, extra: Partial<Scheduled> = {}): Scheduled =>
  ({ id: 1, title, start_date: '2026-11-01', target_date: '2026-11-30', tasks_count: 2, done_tasks_count: 1, ...extra })

test('paints the background, each label, bars with their done part, and a critical outline', () => {
  const { ctx, calls } = recorder()
  const layout = ganttExportLayout([item('Plan', { critical: true }), item('Ship')], new Date(2027, 5, 1))
  paintGantt(ctx, layout, palette)
  expect(calls[0]).toBe('fillStyle=#fff')
  expect(calls.filter((c) => c.startsWith('fillText:Plan')).length).toBe(1)
  expect(calls.filter((c) => c.startsWith('fillText:Ship')).length).toBe(1)
  expect(calls.filter((c) => c.startsWith('strokeRect')).length).toBe(1)
  expect(calls.filter((c) => c.startsWith('fillText:Nov 2026')).length).toBe(1)
})

test('long titles are shortened and undated rows get no bar', () => {
  const { ctx, calls } = recorder()
  const layout = ganttExportLayout([item('x'.repeat(60)), item('Undated', { start_date: null, target_date: null })], new Date(2026, 10, 15))
  paintGantt(ctx, layout, palette)
  expect(calls.some((c) => c.startsWith('fillText:' + 'x'.repeat(33) + '…'))).toBe(true)
  const barFills = calls.filter((c) => c.startsWith('fillRect:') && c.endsWith(',16')) // bar height 28 - 12
  expect(barFills.length).toBe(2) // one bar and its done part, none for the undated row
})
