import type { Sprint } from '@/types'

// Sprints unfinished tasks can move to when `closing` ends: any other sprint
// that isn't already done.
export function carryTargets(sprints: Sprint[], closing: Pick<Sprint, 'id'>): Sprint[] {
  return sprints.filter((s) => s.id !== closing.id && s.status !== 'done')
}

// "3 tasks done, 2 moved on" after closing a sprint.
export function closeSummary(completed: number, carriedOver: number): string {
  const noun = (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'}`
  return `${noun(completed)} done, ${carriedOver} moved on`
}
