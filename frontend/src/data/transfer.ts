// Moving or copying a document or folder into another Space: the words the
// dialog uses and where the result lives. The server rules are in
// backend/app/services/space_transfer.rb.

import type { Document, Folder, WorkspaceSummary } from '@/types'
import { documentsIn } from './folder'
import { canWriteWorkspace, transferTargets } from './workspace'

export type TransferMode = 'move' | 'copy'
export type TransferKind = 'document' | 'folder'

export interface TransferRequest {
  mode: TransferMode
  kind: TransferKind
  id: number
  name: string
  // Every document that goes with the item: itself, or those in a folder.
  documentIds: number[]
}

// What a menu or page offers to move or copy: a TransferRequest without the mode.
export type TransferItem = Omit<TransferRequest, 'mode'>

const VERBS: Record<TransferMode, { present: string; past: string }> = {
  move: { present: 'Move', past: 'Moved' },
  copy: { present: 'Copy', past: 'Copied' },
}

export const transferVerb = (mode: TransferMode) => VERBS[mode].present

// The modes in the order every menu lists them.
export const TRANSFER_MODES: TransferMode[] = ['move', 'copy']

export const transferMenuLabel = (mode: TransferMode) => `${VERBS[mode].present} to Space…`

export const documentTransfer = ({ id, title }: Pick<Document, 'id' | 'title'>): TransferItem =>
  ({ kind: 'document', id, name: title, documentIds: [id] })

// A folder or project goes with every document in it and its subfolders
// (the folder tree has them; the folder page's contents list them too).
export const folderTransfer = (folder: Folder, documents: Pick<Document, 'id'>[] = documentsIn(folder)): TransferItem =>
  ({ kind: 'folder', id: folder.id, name: folder.name, documentIds: documents.map((d) => d.id) })

// The Spaces something can go to from the current one: none when the user can
// only read the current Space (taking things out of it needs the same role as
// editing it). Every menu and page hides its action when this is empty.
export function transferDestinations(current: Pick<WorkspaceSummary, 'id' | 'role'> | undefined, spaces: WorkspaceSummary[]): WorkspaceSummary[] {
  return current && canWriteWorkspace(current.role) ? transferTargets(spaces, current.id) : []
}

export const canTransfer = (destinations: WorkspaceSummary[]) => destinations.length > 0

export const transferTitle = (mode: TransferMode) => `${VERBS[mode].present} to another Space`

// What will happen, so nothing is lost by surprise.
export function transferSummary({ mode, kind, name }: TransferRequest): string {
  if (mode === 'copy') {
    return kind === 'folder'
      ? `A copy of "${name}" with its subfolders, documents and their tasks is added to the Space you choose. The original stays here.`
      : `A copy of "${name}" and its tasks is added to the Space you choose. The original stays here.`
  }
  const leaves = kind === 'folder'
    ? `"${name}" and everything in it will leave this Space, taking its documents' tasks with it.`
    : `"${name}" will leave this Space and take its tasks with it.`
  return `${leaves} A task keeps its title, status and dates; its epic, sprint, milestone, dependencies and event links are cleared.`
}

export const transferDone = ({ mode, name }: TransferRequest, spaceName: string) =>
  `${VERBS[mode].past} "${name}" to ${spaceName}.`

// Where the transferred item opens in the web app.
export const transferPath = (kind: TransferKind, id: number) => `/${kind === 'folder' ? 'folders' : 'documents'}/${id}`

// Whether a page shows something that a move has just taken out of this Space.
export function isMovedPage({ kind, id, documentIds }: TransferRequest, pathname: string): boolean {
  return [transferPath(kind, id), ...documentIds.map((documentId) => transferPath('document', documentId))].includes(pathname)
}
