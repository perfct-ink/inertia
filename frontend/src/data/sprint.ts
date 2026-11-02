import type { Sprint } from '@/types'

// The sprint the Workboard should open on: the first one that is active.
export function activeSprint(sprints: Sprint[]): Sprint | undefined {
  return sprints.find((s) => s.status === 'active')
}

// Where a sprint's board lives: the Workboard filtered to that sprint.
export function sprintBoardPath(sprintId: number): string {
  return `/tasks?view=kanban&sprint_id=${sprintId}`
}
