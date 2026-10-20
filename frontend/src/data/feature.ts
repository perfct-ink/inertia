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
