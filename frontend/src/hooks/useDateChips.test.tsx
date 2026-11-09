import { act, renderHook } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import { useDateChips } from './useDateChips'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockDelete = { mutate: jest.fn() }
const mockDates = { data: [] as unknown[] }
jest.mock('@/api/documentDates', () => ({
  useDocumentDates: () => mockDates,
  useCreateDocumentDate: () => mockCreate,
  useUpdateDocumentDate: () => mockUpdate,
  useDeleteDocumentDate: () => mockDelete,
}))

// The chips (by id) a stand-in document has.
const fakeDoc = (ids: number[]) => ({
  descendants: (visit: (node: unknown, pos: number) => void) => ids.forEach((id, i) => visit({ type: { name: 'documentDate' }, attrs: { dateId: id } }, i)),
})
function fakeEditor(ids: number[], line = 'Ship the beta') {
  const run = jest.fn()
  const insertDocumentDate = jest.fn(() => ({ run }))
  const editor = {
    isDestroyed: false,
    state: { doc: fakeDoc(ids), selection: { $from: { parent: { textContent: line } } } },
    chain: () => ({ focus: () => ({ insertDocumentDate }) }),
    commands: { focus: jest.fn() },
  }
  return { editor, insertDocumentDate, run }
}
const tr = (idsBefore: number[]) => ({ before: fakeDoc(idsBefore) }) as unknown as Transaction

const entry = (id: number) => ({ id, date: '2026-12-01', label: `Date ${id}`, document_id: 9, document_title: 'Plan' })

function setup(ids: number[] = []) {
  const fake = fakeEditor(ids)
  const editorRef = { current: fake.editor as unknown as Editor }
  const hook = renderHook(() => useDateChips(9, 'Launch plan', editorRef))
  return { ...fake, editorRef, hook }
}

afterEach(() => {
  jest.clearAllMocks()
  mockDates.data = []
  mockCreate.isPending = false
})

describe('adding a date', () => {
  test('a typed day makes the chip straight away, labelled with its line', () => {
    const { hook, insertDocumentDate, run } = setup()
    act(() => hook.result.current.onTrigger('2026-12-01', 'Ship the beta'))
    expect(mockCreate.mutate).toHaveBeenCalledWith({ date: '2026-12-01', label: 'Ship the beta', document_id: 9 }, expect.anything())
    expect(hook.result.current.addDialog.open).toBe(false)

    act(() => mockCreate.mutate.mock.calls[0][1].onSuccess({ id: 34 }))
    expect(insertDocumentDate).toHaveBeenCalledWith(34)
    expect(run).toHaveBeenCalled()
  })

  test('an empty line is labelled with the document title', () => {
    const { hook } = setup()
    act(() => hook.result.current.onTrigger('2026-12-01', ''))
    expect(mockCreate.mutate.mock.calls[0][0].label).toBe('Launch plan')
  })

  test('/date and @date open the dialog, which saves and then closes', () => {
    const { hook, insertDocumentDate } = setup()
    act(() => hook.result.current.onTrigger(null, 'Ship the beta'))
    expect(hook.result.current.addDialog).toMatchObject({ open: true, defaultLabel: 'Ship the beta' })

    act(() => hook.result.current.addDialog.onSubmit({ date: '2026-12-02', label: 'Beta' }))
    expect(mockCreate.mutate).toHaveBeenCalledWith({ date: '2026-12-02', label: 'Beta', document_id: 9 }, expect.anything())
    act(() => mockCreate.mutate.mock.calls[0][1].onSuccess({ id: 35 }))
    expect(hook.result.current.addDialog.open).toBe(false)
    expect(insertDocumentDate).toHaveBeenCalledWith(35)
  })

  test('the toolbar button opens the dialog with the line the cursor is on', () => {
    const { hook } = setup()
    act(() => hook.result.current.openDialog())
    expect(hook.result.current.addDialog).toMatchObject({ open: true, defaultLabel: 'Ship the beta' })
    act(() => hook.result.current.addDialog.onClose())
    expect(hook.result.current.addDialog.open).toBe(false)
  })
})

describe('deleting a line with a date', () => {
  test('asks about a chip that is gone while its entry is still linked', () => {
    mockDates.data = [entry(1), entry(2)]
    const { hook, editorRef } = setup([1])
    // The person's first edit: both chips were there; now only 1 is.
    act(() => hook.result.current.noteEdit(tr([1, 2])))
    act(() => hook.result.current.checkRemoved())
    expect(hook.result.current.removedDialog.dates.map((d: { id: number }) => d.id)).toEqual([2])
    expect(editorRef.current).toBeTruthy()
  })

  test('does not ask about a chip that is back by the time edits settle (cut and paste)', () => {
    mockDates.data = [entry(1)]
    const { hook } = setup([1])
    act(() => hook.result.current.noteEdit(tr([1])))
    act(() => hook.result.current.checkRemoved())
    expect(hook.result.current.removedDialog.dates).toEqual([])
  })

  test('does not ask when the person has not edited, or about an entry not linked to this document', () => {
    mockDates.data = [entry(1)]
    const { hook } = setup([])
    act(() => hook.result.current.checkRemoved())
    expect(hook.result.current.removedDialog.dates).toEqual([])
    act(() => hook.result.current.noteEdit(tr([1, 5])))
    act(() => hook.result.current.checkRemoved())
    expect(hook.result.current.removedDialog.dates.map((d: { id: number }) => d.id)).toEqual([1])
  })

  test('keep unlinks the entries and delete deletes them, closing the question either way', () => {
    mockDates.data = [entry(1), entry(2)]
    const { hook } = setup([])
    act(() => hook.result.current.noteEdit(tr([1, 2])))
    act(() => hook.result.current.checkRemoved())
    act(() => hook.result.current.removedDialog.onKeep())
    expect(mockUpdate.mutate.mock.calls).toEqual([[{ id: 1, document_id: null }], [{ id: 2, document_id: null }]])
    expect(hook.result.current.removedDialog.dates).toEqual([])
    expect(mockDelete.mutate).not.toHaveBeenCalled()

    act(() => hook.result.current.noteEdit(tr([1])))
    act(() => hook.result.current.checkRemoved())
    act(() => hook.result.current.removedDialog.onDelete())
    expect(mockDelete.mutate).toHaveBeenCalledWith(1)
    expect(hook.result.current.removedDialog.dates).toEqual([])
  })
})
