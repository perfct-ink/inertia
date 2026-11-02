import type { Sprint } from '@/types'

// The sprint the Workboard should open on: the first one that is active.
export function activeSprint(sprints: Sprint[]): Sprint | undefined {
  return sprints.find((s) => s.status === 'active')
}

// Where a sprint's board lives: the Workboard filtered to that sprint.
export function sprintBoardPath(sprintId: number): string {
  return `/tasks?view=kanban&sprint_id=${sprintId}`
}

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
