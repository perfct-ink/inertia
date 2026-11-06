import type { Document, FeatureStatus, Folder } from '@/types'
import { flattenFolders } from '@/data/folder'

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = { planned: 'Planned', active: 'Active', done: 'Done' }

// Every ordinary document in the Space's feature folders: the candidates for a
// feature's parent, by title, without `excludeId` (the feature itself).
export function parentFeatureOptions(folders: Folder[], excludeId?: number): Document[] {
  return flattenFolders(folders)
    .filter((f) => f.kind === 'feature')
    .flatMap((f) => f.documents ?? [])
    .filter((d) => d.doc_type === 'document' && d.id !== excludeId)
    .sort((a, b) => a.title.localeCompare(b.title))
}

// Whether a document sits in a feature folder (so it is a feature).
export function isFeatureDocument(folders: Folder[], document: Pick<Document, 'folder_id'>): boolean {
  return flattenFolders(folders).some((f) => f.id === document.folder_id && f.kind === 'feature')
}

// A feature made from an epic (docs/features/feature_requirements_docs.md): its
// status worked out from its tasks, the same rule as FeatureRollup on the
// server. No tasks is planned, all done is done, some done is active,
// otherwise planned.
export function epicFeatureStatus({ tasks_count, done_tasks_count }: { tasks_count: number; done_tasks_count: number }): FeatureStatus {
  if (tasks_count === 0) return 'planned'
  if (done_tasks_count >= tasks_count) return 'done'
  return done_tasks_count > 0 ? 'active' : 'planned'
}

// Whether a feature's document is folded down to its tasks is remembered per
// person per feature, so a feature reopens the way it was left.
export const tasksOnlyKey = (userId: number | undefined, epicId: number) => `inertia-tasks-only:${userId ?? 'anonymous'}:${epicId}`

export function readTasksOnly(storage: Pick<Storage, 'getItem'>, key: string): boolean {
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeTasksOnly(storage: Pick<Storage, 'setItem' | 'removeItem'>, key: string, on: boolean): void {
  try {
    if (on) storage.setItem(key, '1')
    else storage.removeItem(key)
  } catch {
    // Storage can be full or blocked; the choice just isn't remembered.
  }
}
