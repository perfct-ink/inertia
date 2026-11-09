import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import DocumentDateView from './DocumentDateView'

// The wrapper only needs to render its element; the editor is not under test here.
jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ as: Tag = 'div', children, ...props }: { as?: 'span'; children: ReactNode }) => <Tag {...props}>{children}</Tag>,
}), { virtual: true })

const mockUpdate = { mutate: jest.fn() }
const mockLoad = { data: undefined as unknown, isError: false, error: null as unknown, refetch: jest.fn() }
jest.mock('@/api/documentDates', () => ({ useDocumentDate: () => mockLoad, useUpdateDocumentDate: () => mockUpdate }))

const entry = { id: 5, date: '2026-12-01', label: 'Ship the beta', document_id: 9, document_title: 'Launch plan' }
const chip = (dateId: number | null = 5) => render(<DocumentDateView {...({ node: { attrs: { dateId } } } as never)} />)

afterEach(() => {
  jest.clearAllMocks()
  Object.assign(mockLoad, { data: undefined, isError: false, error: null })
})

test('shows the day as it is on the calendar, and can be found by its id', () => {
  mockLoad.data = entry
  const { container } = chip()
  expect(screen.getByLabelText('Date: Ship the beta')).toHaveValue('2026-12-01')
  expect(container.querySelector('[data-date-id="5"]')).not.toBeNull()
})

test('changing the day changes the calendar entry', () => {
  mockLoad.data = entry
  chip()
  fireEvent.change(screen.getByLabelText('Date: Ship the beta'), { target: { value: '2026-12-15' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 5, date: '2026-12-15' })
})

test('picking the day it already has saves nothing', () => {
  mockLoad.data = entry
  chip()
  fireEvent.change(screen.getByLabelText('Date: Ship the beta'), { target: { value: '2026-12-01' } })
  expect(mockUpdate.mutate).not.toHaveBeenCalled()
})

test('says so while the date loads', () => {
  chip()
  expect(screen.getByRole('status')).toHaveTextContent('Loading date')
})

test('says so when the entry was deleted', () => {
  mockLoad.isError = true
  mockLoad.error = { isAxiosError: true, response: { status: 404 } }
  chip(null)
  expect(screen.getByText('Deleted date')).toBeInTheDocument()
})

test('says so when the date could not be loaded and can try again', () => {
  mockLoad.isError = true
  chip()
  expect(screen.getByText('Couldn’t load the date')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(mockLoad.refetch).toHaveBeenCalled()
})
