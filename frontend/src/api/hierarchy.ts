import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ItemKind, ItemUpdate, MovePlan } from '@/data/hierarchy'

const ENDPOINT: Record<ItemKind, { path: string; param: string }> = {
  initiative: { path: 'initiatives', param: 'initiative' },
  epic: { path: 'epics', param: 'epic' },
  task: { path: 'tasks', param: 'task' },
}

function patchItem({ kind, id, changes }: ItemUpdate, failureContext: string) {
  const { path, param } = ENDPOINT[kind]
  return api.patch(`/api/v1/${path}/${id}`, { [param]: changes }, { failureContext })
}

// Carries out a MovePlan from data/hierarchy.ts: the item first (its new parent
// and position, which the server may reject), then the siblings that shift to
// make room. A failure shows an error notice that names the move.
export function useMoveHierarchyItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plan: MovePlan) => {
      await patchItem(plan.item, plan.failure)
      await Promise.all(plan.reorders.map((update) => patchItem(update, plan.orderFailure)))
    },
    // Rollups at every level shift when something moves, not just the level that was edited.
    onSettled: () => Promise.all(['milestones', 'initiatives', 'epics', 'tasks'].map((key) => qc.invalidateQueries({ queryKey: [key] }))),
  })
}
