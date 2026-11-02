import { isMovedPage, transferDone, transferPath, transferSummary, transferTitle, transferVerb, type TransferRequest } from './transfer'

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
