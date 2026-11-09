import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentDateRemovedDialog from './DocumentDateRemovedDialog'
import type { DocumentDate } from '@/types'

const date = (id: number, day: string, label: string) => ({ id, date: day, label, document_id: 9, document_title: 'Plan' }) as DocumentDate
const props = { onKeep: jest.fn(), onDelete: jest.fn() }

afterEach(() => jest.clearAllMocks())

test('stays closed when no date was removed', () => {
  render(<DocumentDateRemovedDialog {...props} dates={[]} />)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('asks about the removed date and says what was removed', () => {
  render(<DocumentDateRemovedDialog {...props} dates={[date(1, '2026-12-01', 'Ship the beta')]} />)
  expect(screen.getByRole('dialog', { name: 'Delete it from the calendar too?' })).toBeInTheDocument()
  expect(screen.getByText(/You removed the line with 2026-12-01 \(“Ship the beta”\)/)).toBeInTheDocument()
})

test('lists several removed dates in one question', () => {
  render(<DocumentDateRemovedDialog {...props} dates={[date(1, '2026-12-01', 'a'), date(2, '2026-12-02', 'b')]} />)
  expect(screen.getByRole('dialog', { name: 'Delete them from the calendar too?' })).toBeInTheDocument()
  expect(screen.getByText(/You removed 2 dates from this document: 2026-12-01, 2026-12-02/)).toBeInTheDocument()
})

test('keeps or deletes the calendar entry', () => {
  render(<DocumentDateRemovedDialog {...props} dates={[date(1, '2026-12-01', 'a')]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Keep on the calendar' }))
  expect(props.onKeep).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Delete from the calendar' }))
  expect(props.onDelete).toHaveBeenCalledTimes(1)
})
