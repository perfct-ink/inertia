import { canManageWorkspace } from '@/data/workspace'
import type { WorkspaceRole } from '@/types'

// Saved views: a named set of a page's own choices (sort, grouping, filter,
// zoom, ...), private to the person who saved it or shared with the Space.
// Mirrors the SavedView model and SavedViewBlueprint on the server. What a
// page stores is defined next to the page's data (parseTaskTableConfig in
// taskTable.ts, parsePivotConfig, parseCalendarConfig, parseGanttConfig and
// parseTaskBoardConfig for the Workboard's filters).

// The pages that keep views; the server accepts the same list (SavedView::PAGES).
export const SAVED_VIEW_PAGES = ['task_table', 'pivot', 'calendar', 'gantt', 'tasks'] as const
export type SavedViewPage = (typeof SAVED_VIEW_PAGES)[number]

export const SAVED_VIEW_NAME_MAX = 80

export interface SavedView {
  id: number
  page: SavedViewPage
  name: string
  config: Record<string, unknown>
  shared: boolean
  user_id: number
  owner_name: string
  created_at: string
  updated_at: string
}

// Whether the signed-in person may rename, update or delete a view: their own
// always, and a Space admin's or owner's when it is shared (the server decides
// too; this only decides whether to offer the controls).
export function canChangeSavedView(view: SavedView, userId: number | undefined, role: WorkspaceRole | null | undefined): boolean {
  return view.user_id === userId || (view.shared && canManageWorkspace(role))
}

export interface SavedViewGroups {
  // The person's own views, shared or not.
  mine: SavedView[]
  // Views other people shared with the Space.
  shared: SavedView[]
}

const byName = (a: SavedView, b: SavedView) => a.name.localeCompare(b.name) || a.id - b.id

// The views split the way they are listed: yours first, then everyone else's shared ones.
export function groupSavedViews(views: SavedView[], userId: number | undefined): SavedViewGroups {
  return {
    mine: views.filter((v) => v.user_id === userId).sort(byName),
    shared: views.filter((v) => v.user_id !== userId && v.shared).sort(byName),
  }
}

// How a view reads in the list: your shared ones are tagged, other people's name their owner.
export function savedViewLabel(view: SavedView, userId: number | undefined): string {
  if (view.user_id === userId) return view.shared ? `${view.name} (shared)` : view.name
  return `${view.name} (${view.owner_name})`
}

// Whether two configs hold the same choices, whatever order their keys are in.
export function sameConfig(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b)
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y))
    return `{${entries.map(([key, v]) => `${JSON.stringify(key)}:${stable(v)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
