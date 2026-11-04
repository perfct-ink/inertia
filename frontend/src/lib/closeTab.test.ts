import { QueryClient } from '@tanstack/react-query'
import { closeTab } from './closeTab'
import { markTouched, markUntouched } from '@/store/untouchedDocuments'
import { useTabsStore } from '@/store/tabs'

const mockDestroy = jest.fn().mockResolvedValue(undefined)
jest.mock('@/api/documents', () => ({ documentApi: { destroy: (id: number) => mockDestroy(id) } }))

const qc = new QueryClient()
beforeEach(() => {
  useTabsStore.getState().reset()
  useTabsStore.getState().openTab({ id: '5', path: '/documents/5', title: 'Untitled Document', docType: 'document' })
})
afterEach(() => { jest.clearAllMocks(); markTouched(5) })

test('closing the tab of an unchanged new document deletes it', () => {
  markUntouched(5)
  closeTab('5', qc)
  expect(mockDestroy).toHaveBeenCalledWith(5)
  expect(useTabsStore.getState().tabs).toHaveLength(0)
})

test('a document that was edited is kept', () => {
  markUntouched(5)
  markTouched(5)
  closeTab('5', qc)
  expect(mockDestroy).not.toHaveBeenCalled()
})

test('a document not made from "new document" is kept', () => {
  closeTab('5', qc)
  expect(mockDestroy).not.toHaveBeenCalled()
})
