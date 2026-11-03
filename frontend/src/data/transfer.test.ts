import {
  attachedBlocker, attachedNotice, isMovedPage, recordList, transferDone, transferPath, transferSummary, transferTitle, transferVerb,
  type AttachedRecords, type TransferRequest,
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

describe('records filed directly under a folder', () => {
  const some: AttachedRecords = { detach: { tasks: 2, events: 1 }, blocked: { resource_allocations: 1 } }
  const none: AttachedRecords = { detach: {}, blocked: {} }

  test('the counts read as one list with the right plurals', () => {
    expect(recordList({})).toBe('')
    expect(recordList({ tasks: 1 })).toBe('1 task')
    expect(recordList({ tasks: 2, events: 1 })).toBe('2 tasks and 1 event')
    expect(recordList({ tasks: 2, events: 1, io_nodes: 3, epics: 0 })).toBe('2 tasks, 1 event and 3 objectives map items')
    expect(recordList({ something_new: 2 })).toBe('2 something new')
  })

  test('a move says what it detaches and a copy what it leaves behind', () => {
    expect(attachedNotice('move', some)).toBe(
      'The move detaches 2 tasks and 1 event filed directly under this folder or its subfolders. They stay in this Space.',
    )
    expect(attachedNotice('copy', some)).toContain('The copy leaves behind 2 tasks, 1 event and 1 allocation filed directly')
  })

  test('there is nothing to say when nothing is filed under the folder', () => {
    expect(attachedNotice('move', none)).toBeNull()
    expect(attachedNotice('copy', none)).toBeNull()
    expect(attachedNotice('move', { detach: {}, blocked: { resource_allocations: 2 } })).toBeNull()
  })

  test('records that cannot be detached block a move but not a copy', () => {
    expect(attachedBlocker('move', some)).toBe(
      "A move can't detach 1 allocation from this folder or its subfolders. Remove them first, or copy the folder instead.",
    )
    expect(attachedBlocker('copy', some)).toBeNull()
    expect(attachedBlocker('move', none)).toBeNull()
  })
})
