// Moving or copying a document or folder into another Space: the words the
// dialog uses and where the result lives. The server rules are in
// backend/app/services/space_transfer.rb.

import { idPath } from './path'

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

const VERBS: Record<TransferMode, { present: string; past: string }> = {
  move: { present: 'Move', past: 'Moved' },
  copy: { present: 'Copy', past: 'Copied' },
}

export const transferVerb = (mode: TransferMode) => VERBS[mode].present

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
// The id path is used: it works before the other Space's tree has loaded, and
// ItemRoute then swaps it for the hierarchical path.
export const transferPath = (kind: TransferKind, id: number) => idPath({ type: kind, id })

// Whether a page shows something that a move has just taken out of this Space.
export function isMovedPage({ kind, id, documentIds }: TransferRequest, pathname: string): boolean {
  return [transferPath(kind, id), ...documentIds.map((documentId) => transferPath('document', documentId))].includes(pathname)
}
