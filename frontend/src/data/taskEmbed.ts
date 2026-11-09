import type { Folder, Task, TaskStatus } from '@/types'
import { flattenFolders, folderChoices, spaceFiles } from './folder'
import { DEFAULT_STATUS_LABEL, TASK_STATUSES } from './task_status'

// A live task list or Gantt placed inside a document (the `taskEmbed` node).
// The node stores only what to show; the tasks themselves are read from the
// Space every time, so the embed is never out of date. Pure, so the rules are
// tested without the editor; the Tiptap node and its view only apply them.
//
// Privacy: no task, title, count or name is ever written into the node (or the
// collab document, the saved content or the static HTML). A reader's browser
// asks the API for the tasks with the reader's own sign-in and Space, so a
// person who cannot see a task never receives it, however the document got to
// them; at worst they see an error or an empty list.

export type TaskEmbedView = 'list' | 'gantt'

// Which tasks: all of the Space's, or those of one document, folder or sprint.
export type TaskEmbedScope = 'space' | 'document' | 'folder' | 'sprint'

// 'open' is every status but done; 'all' is every status.
export type TaskEmbedStatus = 'open' | 'all' | TaskStatus

// The attributes of the `taskEmbed` document node.
export interface TaskEmbedAttrs {
  view: TaskEmbedView
  scope: TaskEmbedScope
  // The folder or sprint a narrower scope names; null for the whole Space and
  // for "This document", which is whichever document the embed sits in (so a
  // copy of the document lists the copy's tasks).
  scopeId: number | null
  status: TaskEmbedStatus
}

// A new embed: the open tasks of the whole Space, as a list.
export const TASK_EMBED_DEFAULTS: TaskEmbedAttrs = { view: 'list', scope: 'space', scopeId: null, status: 'open' }

export const TASK_EMBED_VIEWS: { key: TaskEmbedView; label: string }[] = [
  { key: 'list', label: 'List' },
  { key: 'gantt', label: 'Gantt' },
]

export const TASK_EMBED_SCOPES: { key: TaskEmbedScope; label: string }[] = [
  { key: 'space', label: 'Whole Space' },
  { key: 'document', label: 'This document' },
  { key: 'folder', label: 'One folder' },
  { key: 'sprint', label: 'One sprint' },
]

export const TASK_EMBED_STATUSES: { key: TaskEmbedStatus; label: string }[] = [
  { key: 'open', label: 'Open tasks' },
  { key: 'all', label: 'All statuses' },
  ...TASK_STATUSES.map((key) => ({ key, label: DEFAULT_STATUS_LABEL[key] })),
]

// The scopes that need an id to say which folder or sprint.
const NEEDS_ID: TaskEmbedScope[] = ['folder', 'sprint']

export const scopeNeedsId = (scope: TaskEmbedScope): boolean => NEEDS_ID.includes(scope)

const isOneOf = <T extends string>(options: { key: T }[], value: unknown): value is T =>
  options.some((option) => option.key === value)

// Attributes from anywhere (pasted HTML, a collaborator on another version, an
// old document): a value that isn't one of ours becomes the default, and an id
// is a positive whole number or nothing.
export function normalizeTaskEmbed(attrs: Record<string, unknown> | null | undefined): TaskEmbedAttrs {
  const raw = attrs ?? {}
  const scope = isOneOf(TASK_EMBED_SCOPES, raw.scope) ? raw.scope : TASK_EMBED_DEFAULTS.scope
  const id = Number(raw.scopeId)
  return {
    view: isOneOf(TASK_EMBED_VIEWS, raw.view) ? raw.view : TASK_EMBED_DEFAULTS.view,
    scope,
    scopeId: scopeNeedsId(scope) && raw.scopeId != null && Number.isInteger(id) && id > 0 ? id : null,
    status: isOneOf(TASK_EMBED_STATUSES, raw.status) ? raw.status : TASK_EMBED_DEFAULTS.status,
  }
}

// The embed's attributes as the static HTML form writes them (`data-*`) ...
export function taskEmbedDataAttributes(attrs: TaskEmbedAttrs): Record<string, string> {
  return {
    'data-view': attrs.view,
    'data-scope': attrs.scope,
    ...(attrs.scopeId != null && { 'data-scope-id': String(attrs.scopeId) }),
    'data-status': attrs.status,
  }
}

// ... and read back from an element carrying them.
export function taskEmbedAttrsFromElement(element: { getAttribute(name: string): string | null }): TaskEmbedAttrs {
  return normalizeTaskEmbed({
    view: element.getAttribute('data-view'),
    scope: element.getAttribute('data-scope'),
    scopeId: element.getAttribute('data-scope-id'),
    status: element.getAttribute('data-status'),
  })
}

// The query-string filters GET /api/v1/tasks takes for the embed's scope, or
// null while a folder or sprint has not been chosen yet (or the document the
// embed sits in is not known). (A folder means tasks in that folder itself,
// directly or through its documents.)
export function taskEmbedFilters(
  attrs: TaskEmbedAttrs, documentId: number | null,
): { document_id?: number; folder_id?: number; sprint_id?: number } | null {
  if (attrs.scope === 'space') return {}
  if (attrs.scope === 'document') return documentId == null ? null : { document_id: documentId }
  if (attrs.scopeId == null) return null
  if (attrs.scope === 'folder') return { folder_id: attrs.scopeId }
  return { sprint_id: attrs.scopeId }
}

// What to tell the person while the scope has nothing to list yet.
export const SCOPE_PROMPT: Record<TaskEmbedScope, string> = {
  space: '',
  document: 'This document has not been saved yet, so it has no tasks to list.',
  folder: 'Choose a folder to list its tasks.',
  sprint: 'Choose a sprint to list its tasks.',
}

// "Open tasks in Sprint 3": what is shown and where from. `scopeName` is the
// chosen document, folder or sprint when it is known.
export function taskEmbedHeading(attrs: TaskEmbedAttrs, scopeName: string | null): string {
  const label = TASK_EMBED_STATUSES.find((s) => s.key === attrs.status)?.label ?? ''
  const what = attrs.status === 'open' ? 'Open tasks' : attrs.status === 'all' ? 'All tasks' : `${label} tasks`
  const where = attrs.scope === 'space' ? 'this Space' : scopeName
  return where ? `${what} in ${where}` : what
}

// The name of the folder (by its path) or document a scope points at, or null
// for the Space, a sprint (named by its own list) or one that no longer exists.
// `documentId` is the document the embed sits in.
export function scopeNameIn(attrs: TaskEmbedAttrs, folders: Folder[], documentId: number | null): string | null {
  if (attrs.scope === 'document') {
    return documentId == null ? null : spaceFiles(folders).find((f) => f.document.id === documentId)?.document.title || null
  }
  if (attrs.scopeId == null) return null
  if (attrs.scope === 'folder') return folderChoices(flattenFolders(folders)).find((c) => c.id === attrs.scopeId)?.label ?? null
  return null
}

const matchesStatus = (task: Task, status: TaskEmbedStatus): boolean =>
  status === 'all' || (status === 'open' ? task.status !== 'done' : task.status === status)

// The scope's tasks with the status filter applied.
export function filterEmbedTasks(tasks: Task[], status: TaskEmbedStatus): Task[] {
  return tasks.filter((task) => matchesStatus(task, status))
}

// Soonest due date first, tasks with no date last, then the board order.
export function sortEmbedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date < b.due_date ? -1 : 1
    }
    return a.position - b.position || a.id - b.id
  })
}

// What a list shows: filtered, then in due-date order.
export function embedTasks(tasks: Task[], status: TaskEmbedStatus): Task[] {
  return sortEmbedTasks(filterEmbedTasks(tasks, status))
}

// How much of the scope is finished, whatever the status filter hides.
export function embedProgress(tasks: Pick<Task, 'status'>[]): { done: number; total: number; percent: number } {
  const done = tasks.filter((task) => task.status === 'done').length
  return { done, total: tasks.length, percent: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0 }
}

// Tasks with no due date have no end to draw, so the Gantt leaves them out.
export function unscheduledCount(tasks: Pick<Task, 'due_date'>[]): number {
  return tasks.filter((task) => !task.due_date).length
}
