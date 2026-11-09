import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentDateDialog from './DocumentDateDialog'

const props = { open: true, defaultLabel: 'Ship the beta', pending: false, onSubmit: jest.fn(), onClose: jest.fn() }

afterEach(() => jest.clearAllMocks())

test('collects a day and a label, starting with the line it was typed on', () => {
  render(<DocumentDateDialog {...props} />)
  expect(screen.getByLabelText('Label on the calendar')).toHaveValue('Ship the beta')
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-12-01' } })
  fireEvent.change(screen.getByLabelText('Label on the calendar'), { target: { value: 'Public beta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add date' }))
  expect(props.onSubmit).toHaveBeenCalledWith({ date: '2026-12-01', label: 'Public beta' })
})

test('starts on the day that was typed in the document', () => {
  render(<DocumentDateDialog {...props} defaultDate="2026-12-01" />)
  expect(screen.getByLabelText('Date')).toHaveValue('2026-12-01')
})

test('a day is needed', () => {
  render(<DocumentDateDialog {...props} />)
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Add date' })).toBeDisabled()
})

test('shows that the date is being added and does not add it twice', () => {
  render(<DocumentDateDialog {...props} pending />)
  expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled()
})

test('cancel closes without adding anything', () => {
  render(<DocumentDateDialog {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(props.onClose).toHaveBeenCalled()
  expect(props.onSubmit).not.toHaveBeenCalled()
})
