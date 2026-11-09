import type { Document, Folder } from '@/types'
import { folderTrail } from './folder'

// "Linked from 1 document", "Linked from 3 documents": the heading of the backlinks panel.
export function backlinksTitle(count: number): string {
  return `Linked from ${count} ${count === 1 ? 'document' : 'documents'}`
}

// Where a linking document lives, as the folder names from the top of the Space
// ("Album / Songs"), or '' when it sits directly in the Root (or is not found).
export function backlinkLocation(folders: Folder[], doc: Pick<Document, 'folder_id'>): string {
  return folderTrail(folders, doc.folder_id).map((folder) => folder.name).join(' / ')
}
