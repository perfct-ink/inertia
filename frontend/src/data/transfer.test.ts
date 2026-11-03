import type { Document, Folder, WorkspaceSummary } from '@/types'
import {
  TRANSFER_MODES, canTransfer, documentTransfer, folderTransfer, isMovedPage, transferDestinations, transferDone, transferMenuLabel,
  transferPath, transferSummary, transferTitle, transferVerb, type TransferRequest,
} from './transfer'

const request = (overrides: Partial<TransferRequest> = {}): TransferRequest =>
  ({ mode: 'move', kind: 'document', id: 7, name: 'Plan', documentIds: [7], ...overrides })

test('titles and buttons name the action', () => {
  expect(transferTitle('move')).toBe('Move to another Space')
  expect(transferTitle('copy')).toBe('Copy to another Space')
  expect(transferVerb('copy')).toBe('Copy')
})

test('a copy says the original stays and a move says what is cleared', () => {
  expect(transferSummary(request({ mode: 'copy' }))).toContain('The original stays here.')
  const move = transferSummary(request())
  expect(move).toContain('"Plan" will leave this Space')
  expect(move).toContain('epic, sprint, milestone, dependencies and event links are cleared')
})

test('a folder summary covers what is inside it', () => {
  expect(transferSummary(request({ kind: 'folder', name: 'Plans' }))).toContain('everything in it')
  expect(transferSummary(request({ kind: 'folder', name: 'Plans', mode: 'copy' }))).toContain('subfolders, documents and their tasks')
})

test('the result names the item and the Space', () => {
  expect(transferDone(request({ mode: 'copy' }), 'Team')).toBe('Copied "Plan" to Team.')
  expect(transferDone(request(), 'Team')).toBe('Moved "Plan" to Team.')
})

test('items open at their own page', () => {
  expect(transferPath('document', 7)).toBe('/documents/7')
  expect(transferPath('folder', 3)).toBe('/folders/3')
})

test('a moved item, or any document that went with it, is no longer a page of this Space', () => {
  const folder = request({ kind: 'folder', id: 3, name: 'Plans', documentIds: [7, 8] })
  expect(isMovedPage(folder, '/folders/3')).toBe(true)
  expect(isMovedPage(folder, '/documents/8')).toBe(true)
  expect(isMovedPage(folder, '/documents/9')).toBe(false)
  expect(isMovedPage(request(), '/documents/7')).toBe(true)
  expect(isMovedPage(request(), '/tasks')).toBe(false)
})

const doc = (id: number, title = `Doc ${id}`) => ({ id, title }) as Document
const folder = (id: number, name: string, documents: Document[] = [], children: Folder[] = []) => ({ id, name, documents, children }) as Folder
const space = (id: number, role: WorkspaceSummary['role']): WorkspaceSummary => ({ id, name: `Space ${id}`, personal: false, role })

test('menus list move first, then copy, worded the same everywhere', () => {
  expect(TRANSFER_MODES.map(transferMenuLabel)).toEqual(['Move to Space…', 'Copy to Space…'])
})

test('a document is offered by its id and title', () => {
  expect(documentTransfer(doc(7, 'Plan'))).toEqual({ kind: 'document', id: 7, name: 'Plan', documentIds: [7] })
})

test('a folder is offered with the documents in it and in its subfolders', () => {
  const plans = folder(3, 'Plans', [doc(1)], [folder(4, 'Old', [doc(2), doc(5)])])
  expect(folderTransfer(plans)).toEqual({ kind: 'folder', id: 3, name: 'Plans', documentIds: [1, 2, 5] })
  // The folder page already has the whole list.
  expect(folderTransfer(plans, [doc(9)]).documentIds).toEqual([9])
})

test('a transfer is only offered when the user can write here and in another Space', () => {
  const spaces = [space(1, 'owner'), space(2, 'member'), space(3, 'viewer'), space(4, 'admin')]
  expect(transferDestinations({ id: 1, role: 'owner' }, spaces).map((s) => s.id)).toEqual([2, 4])
  expect(transferDestinations({ id: 1, role: 'viewer' }, spaces)).toEqual([])
  expect(transferDestinations(undefined, spaces)).toEqual([])
  expect(transferDestinations({ id: 1, role: 'owner' }, [space(1, 'owner'), space(3, 'viewer')])).toEqual([])
  expect(canTransfer(transferDestinations({ id: 1, role: 'member' }, spaces))).toBe(true)
  expect(canTransfer([])).toBe(false)
})
