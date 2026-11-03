// Moving or copying a document or folder into another Space: the words the
// dialog uses and where the result lives. The server rules are in
// backend/app/services/space_transfer.rb.

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

// Records filed directly under a folder or its subfolders, not through a
// document, counted by kind (the server's names; only kinds that have records
// are present). A move detaches `detach` (they stay in this Space with no
// folder) and is refused while `blocked` has any; a copy leaves both behind.
export type RecordCounts = Record<string, number>
export interface AttachedRecords { detach: RecordCounts; blocked: RecordCounts }

const RECORD_NAMES: Record<string, [one: string, many: string]> = {
  tasks: ['task', 'tasks'],
  events: ['event', 'events'],
  epics: ['epic', 'epics'],
  milestones: ['milestone', 'milestones'],
  initiatives: ['initiative', 'initiatives'],
  sprints: ['sprint', 'sprints'],
  ideas: ['idea', 'ideas'],
  objectives: ['objective', 'objectives'],
  io_nodes: ['objectives map item', 'objectives map items'],
  releases: ['release', 'releases'],
  project_requests: ['project request', 'project requests'],
  resource_allocations: ['allocation', 'allocations'],
}

// "2 tasks", "2 tasks and 1 event", "2 tasks, 1 event and 3 epics"; '' for none.
export function recordList(counts: RecordCounts): string {
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => {
      const fallback = kind.replace(/_/g, ' ')
      const [one, many] = RECORD_NAMES[kind] ?? [fallback, fallback]
      return `${count} ${count === 1 ? one : many}`
    })
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '')
}

// What the move detaches or the copy leaves behind, so nothing is cut by surprise.
export function attachedNotice(mode: TransferMode, { detach, blocked }: AttachedRecords): string | null {
  const list = recordList(mode === 'move' ? detach : { ...detach, ...blocked })
  if (!list) return null
  return `The ${mode === 'move' ? 'move detaches' : 'copy leaves behind'} ${list} filed directly under this folder or its subfolders. They stay in this Space.`
}

// Why a move can't go ahead: records that can't be detached.
export function attachedBlocker(mode: TransferMode, { blocked }: AttachedRecords): string | null {
  const list = mode === 'move' ? recordList(blocked) : ''
  return list ? `A move can't detach ${list} from this folder or its subfolders. Remove them first, or copy the folder instead.` : null
}

export const transferDone = ({ mode, name }: TransferRequest, spaceName: string) =>
  `${VERBS[mode].past} "${name}" to ${spaceName}.`

// Where the transferred item opens in the web app.
export const transferPath = (kind: TransferKind, id: number) => `/${kind === 'folder' ? 'folders' : 'documents'}/${id}`

// Whether a page shows something that a move has just taken out of this Space.
export function isMovedPage({ kind, id, documentIds }: TransferRequest, pathname: string): boolean {
  return [transferPath(kind, id), ...documentIds.map((documentId) => transferPath('document', documentId))].includes(pathname)
}
