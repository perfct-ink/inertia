import { promotedPath, sortIdeas } from './idea'
import type { Idea } from '@/types'

const idea = (id: number, status: Idea['status'], created_at: string, promoted_type: Idea['promoted_type'] = null) =>
  ({ id, status, created_at, promoted_type }) as Idea

test('open ideas come first, newest first, then promoted, then declined', () => {
  const sorted = sortIdeas([idea(1, 'declined', '2026-10-03'), idea(2, 'open', '2026-10-01'), idea(3, 'open', '2026-10-02'), idea(4, 'promoted', '2026-10-04')])
  expect(sorted.map((i) => i.id)).toEqual([3, 2, 4, 1])
})

test('a promoted idea points at its epics or initiatives page', () => {
  expect(promotedPath(idea(1, 'promoted', '', 'Initiative'))).toBe('/initiatives')
  expect(promotedPath(idea(2, 'promoted', '', 'Epic'))).toBe('/epics')
  expect(promotedPath(idea(3, 'open', ''))).toBeNull()
})
