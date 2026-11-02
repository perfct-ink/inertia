import type { Folder, TaskStatus, TaskStatusColor, TaskStatusSetting } from '@/types'
import { flattenFolders } from './folder'

// Every status a task can be in, in the order a task moves through them.
export const TASK_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

// The columns of a board. Backlog is the list a task waits in before the board.
export const BOARD_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done']

// Mirrors TaskStatusSetting::COLORS on the server.
export const TASK_STATUS_COLORS: TaskStatusColor[] = ['gray', 'blue', 'yellow', 'green', 'orange', 'red', 'purple']

export const COLOR_LABEL: Record<TaskStatusColor, string> = {
  gray: 'Gray',
  blue: 'Blue',
  yellow: 'Yellow',
  green: 'Green',
  orange: 'Orange',
  red: 'Red',
  purple: 'Purple',
}

// Mirrors TaskStatusSetting::LABEL_MAX_LENGTH on the server.
export const STATUS_LABEL_MAX_LENGTH = 40

export const DEFAULT_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

export const DEFAULT_STATUS_COLOR: Record<TaskStatus, TaskStatusColor> = {
  backlog: 'gray',
  todo: 'gray',
  in_progress: 'blue',
  in_review: 'yellow',
  done: 'green',
}

// Where the "move to next status" arrow sends a task.
export const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  backlog: 'todo',
  todo: 'in_progress',
  in_progress: 'in_review',
  in_review: 'done',
  done: null,
}

// How a board shows one status.
export interface StatusStyle {
  label: string
  color: TaskStatusColor
}

export type BoardStatuses = Record<TaskStatus, StatusStyle>

// One status a board changes: only what differs from what it would show anyway.
export interface StatusOverride {
  status: TaskStatus
  label?: string
  color?: TaskStatusColor
}

// The folders a board takes its statuses from, nearest first: the board's own
// folder, then the folders above it. Root is left out because the Space
// default stands for it (a null folder_id); no folder means just the default.
export function boardScope(folders: Folder[], folderId: number | null | undefined): number[] {
  if (folderId == null) return []
  const byId = new Map(flattenFolders(folders).map((folder) => [folder.id, folder]))
  // Folders not loaded yet: the folder's own settings are still the best guess.
  if (!byId.has(folderId)) return [folderId]
  const scope: number[] = []
  let current = byId.get(folderId)
  while (current && !current.root && !scope.includes(current.id)) {
    scope.push(current.id)
    current = current.parent_id != null ? byId.get(current.parent_id) : undefined
  }
  return scope
}

// What a board shows for each status: the nearest folder in `scope` that sets
// a label (or colour) wins, then the Space default, then the built-in one.
// Label and colour are looked up separately, so a folder that only recolours
// a status still takes its name from above.
export function resolveStatuses(settings: TaskStatusSetting[], scope: number[]): BoardStatuses {
  const layers: (number | null)[] = [...scope, null]
  const styles = {} as BoardStatuses
  for (const status of TASK_STATUSES) {
    const rows = layers.map((folderId) => settings.find((s) => s.status === status && (s.folder_id ?? null) === folderId))
    styles[status] = {
      label: rows.find((row) => row?.label)?.label ?? DEFAULT_STATUS_LABEL[status],
      color: rows.find((row) => row?.color)?.color ?? DEFAULT_STATUS_COLOR[status],
    }
  }
  return styles
}

// What every board shows until a Space or folder changes it.
export const DEFAULT_BOARD_STATUSES: BoardStatuses = resolveStatuses([], [])

// The folder a scope belongs to when it is edited: the nearest one, or null
// for the Space default.
export function editedFolderId(scope: number[]): number | null {
  return scope[0] ?? null
}

// What the board would show with none of its own settings: the folders above
// it and the Space default, or for the Space default itself the built-in ones.
export function inheritedStatuses(settings: TaskStatusSetting[], scope: number[]): BoardStatuses {
  return scope.length === 0 ? DEFAULT_BOARD_STATUSES : resolveStatuses(settings, scope.slice(1))
}

// Whether the board being edited has settings of its own.
export function hasOwnSettings(settings: TaskStatusSetting[], scope: number[]): boolean {
  const folderId = editedFolderId(scope)
  return settings.some((s) => (s.folder_id ?? null) === folderId)
}

// The settings to send for an edited board. A label or colour that matches
// what the board would show anyway is not stored, so the board keeps following
// the defaults it inherits; an emptied label also goes back to them.
export function overridesFromStyles(edited: BoardStatuses, inherited: BoardStatuses): StatusOverride[] {
  return TASK_STATUSES.flatMap((status) => {
    const label = edited[status].label.trim()
    const override: StatusOverride = { status }
    if (label && label !== inherited[status].label) override.label = label
    if (edited[status].color !== inherited[status].color) override.color = edited[status].color
    return override.label || override.color ? [override] : []
  })
}

// Inline `Move to ...` text for the arrow that advances a task.
export function nextStatusLabel(statuses: BoardStatuses, status: TaskStatus): string | null {
  const next = NEXT_STATUS[status]
  return next ? statuses[next].label : null
}
